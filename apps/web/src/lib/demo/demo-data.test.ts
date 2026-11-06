import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  DEFAULT_DESTINATION_FILTER,
  DEFAULT_EXPERIENCE_FILTER,
  DESTINATIONS,
  EXPERIENCES,
  PERIOD_ORDER,
  PLANNER_SCENARIOS,
  TRIPS,
  countExperiencesByCategory,
  filterDestinations,
  filterExperiences,
  formatVnd,
  getAvailableDestinations,
  getDestinationBySlug,
  getExperienceBySlug,
  getRelatedExperiences,
  getTripBudgetTotalVnd,
  getTripBySlug,
  getTripsFeaturingExperience,
  matchScenario,
  normalizeText,
} from "./index.ts";
import { fromCatalogDestination, fromDemoDestination } from "../catalog-view-models.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public");

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

describe("demo data integrity", () => {
  it("uses unique, URL-safe slugs in every collection", () => {
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    for (const collection of [DESTINATIONS, EXPERIENCES, TRIPS]) {
      const slugs = collection.map((record) => record.slug);
      assert.ok(unique(slugs), "slugs must be unique");
      for (const slug of slugs) assert.match(slug, slugPattern);
    }
  });

  it("resolves every destination → experience and → trip relationship", () => {
    for (const destination of DESTINATIONS) {
      for (const slug of destination.experienceSlugs) {
        const experience = getExperienceBySlug(slug);
        assert.ok(experience, `missing experience ${slug}`);
        assert.equal(experience.destinationSlug, destination.slug);
      }
      if (destination.tripSlug) assert.ok(getTripBySlug(destination.tripSlug), `missing trip ${destination.tripSlug}`);
    }
  });

  it("gives every experience and trip a valid destination", () => {
    for (const experience of EXPERIENCES) assert.ok(getDestinationBySlug(experience.destinationSlug));
    for (const trip of TRIPS) assert.ok(getDestinationBySlug(trip.destinationSlug));
  });

  it("keeps coming-soon destinations free of fabricated detail content", () => {
    const comingSoon = DESTINATIONS.filter((destination) => destination.status === "coming-soon");
    assert.ok(comingSoon.length > 0);
    for (const destination of comingSoon) {
      assert.equal(destination.image, null);
      assert.equal(destination.tripSlug, null);
      assert.deepEqual(destination.experienceSlugs, []);
      assert.deepEqual(destination.description, []);
    }
    assert.deepEqual(
      getAvailableDestinations().map((destination) => destination.slug),
      ["da-lat"],
    );
  });

  it("references image files that exist in /public", () => {
    const images = [
      ...DESTINATIONS.flatMap((destination) => (destination.image ? [destination.image] : [])),
      ...EXPERIENCES.map((experience) => experience.image),
      ...TRIPS.map((trip) => trip.cover),
    ];
    for (const image of images) {
      assert.ok(image.alt.length > 10, `alt text too short for ${image.src}`);
      assert.ok(existsSync(join(publicDir, image.src)), `missing image ${image.src}`);
    }
  });

  it("labels every record with an honest provenance", () => {
    for (const record of [...DESTINATIONS, ...EXPERIENCES]) assert.equal(record.provenance, "editorial");
    for (const trip of TRIPS) assert.equal(trip.provenance, "demo-fixture");
  });
});

describe("itineraries", () => {
  it("orders day records 1..N and matches the declared duration", () => {
    for (const trip of TRIPS) {
      assert.equal(trip.days.length, trip.durationDays);
      trip.days.forEach((day, index) => assert.equal(day.day, index + 1));
    }
  });

  it("progresses through each day without going backwards", () => {
    for (const trip of TRIPS) {
      for (const day of trip.days) {
        assert.ok(day.activities.length > 0);
        const orders = day.activities.map((activity) => PERIOD_ORDER[activity.period]);
        assert.deepEqual(orders, [...orders].sort((a, b) => a - b), `${trip.slug} day ${day.day}`);
      }
    }
  });

  it("uses unique activity ids and resolvable experience links", () => {
    for (const trip of TRIPS) {
      const ids = trip.days.flatMap((day) => day.activities.map((activity) => activity.id));
      assert.ok(unique(ids), `${trip.slug} activity ids must be unique`);
      for (const day of trip.days) {
        for (const activity of day.activities) {
          if (activity.experienceSlug) {
            assert.ok(getExperienceBySlug(activity.experienceSlug), `missing ${activity.experienceSlug}`);
          }
        }
      }
    }
  });

  it("keeps illustrative budgets as positive integer VND", () => {
    for (const trip of TRIPS) {
      for (const day of trip.days) {
        assert.ok(Number.isInteger(day.illustrativeBudgetVnd) && day.illustrativeBudgetVnd > 0);
      }
      assert.equal(
        getTripBudgetTotalVnd(trip),
        trip.days.reduce((sum, day) => sum + day.illustrativeBudgetVnd, 0),
      );
    }
    assert.match(formatVnd(1200000), /^1\.200\.000\s?₫$/);
  });

  it("states the demo limits in every trip's plan notes", () => {
    for (const trip of TRIPS) {
      assert.ok(trip.planNotes.some((note) => note.includes("không do AI tạo ra")));
      assert.ok(trip.planNotes.some((note) => note.includes("không phải báo giá")));
    }
  });

  it("finds trips that feature an experience", () => {
    const slugs = getTripsFeaturingExperience("hoang-hon-ben-ho").map((trip) => trip.slug);
    assert.deepEqual(slugs.sort(), ["da-lat-3-ngay", "da-lat-cuoi-tuan-2-ngay"]);
  });
});

describe("planner scenarios", () => {
  it("resolves every scenario to a valid trip preview", () => {
    for (const scenario of PLANNER_SCENARIOS) {
      assert.ok(getTripBySlug(scenario.tripSlug), `missing trip ${scenario.tripSlug}`);
      assert.ok(scenario.steps.length > 0);
    }
    assert.ok(unique(PLANNER_SCENARIOS.map((scenario) => scenario.id)));
  });

  it("matches the supported prompts, tolerant of case, accents, and punctuation", () => {
    const first = PLANNER_SCENARIOS[0];
    assert.ok(first);
    assert.equal(matchScenario(first.prompt)?.id, first.id);
    assert.equal(matchScenario("  lên KẾ hoạch chuyến đi 3 ngày tới đà lạt  ")?.id, first.id);
    assert.equal(matchScenario("Plan a 3-day trip to Da Lat.")?.id, first.id);
  });

  it("never matches arbitrary or partial prompts", () => {
    for (const text of [
      "",
      "   ",
      "Hello",
      "Lên kế hoạch chuyến đi 5 ngày tới Hội An",
      "Lên kế hoạch chuyến đi",
      "Đà Lạt",
      "Plan a trip to Paris",
    ]) {
      assert.equal(matchScenario(text), undefined, `unexpected match for "${text}"`);
    }
  });

  it("normalises Vietnamese text", () => {
    assert.equal(normalizeText("Đà Lạt — Sương!"), "da lat suong");
  });
});

describe("discovery filters", () => {
  it("returns everything for the default filters", () => {
    assert.equal(filterDestinations(DESTINATIONS, DEFAULT_DESTINATION_FILTER).length, DESTINATIONS.length);
    assert.equal(filterExperiences(EXPERIENCES, DEFAULT_EXPERIENCE_FILTER).length, EXPERIENCES.length);
  });

  it("filters destinations by region, availability, and accent-insensitive query", () => {
    const coast = filterDestinations(DESTINATIONS, { ...DEFAULT_DESTINATION_FILTER, region: "ven-bien" });
    assert.deepEqual(coast.map((destination) => destination.slug).sort(), ["hoi-an", "phu-quoc"]);

    const available = filterDestinations(DESTINATIONS, { ...DEFAULT_DESTINATION_FILTER, availability: "available" });
    assert.deepEqual(available.map((destination) => destination.slug), ["da-lat"]);

    const search = filterDestinations(DESTINATIONS, { ...DEFAULT_DESTINATION_FILTER, query: "da lat" });
    assert.deepEqual(search.map((destination) => destination.slug), ["da-lat"]);

    assert.equal(filterDestinations(DESTINATIONS, { ...DEFAULT_DESTINATION_FILTER, query: "zzzz" }).length, 0);
  });

  it("filters experiences by category and query, with consistent counts", () => {
    const counts = countExperiencesByCategory();
    for (const category of Object.keys(counts) as (keyof typeof counts)[]) {
      const results = filterExperiences(EXPERIENCES, { ...DEFAULT_EXPERIENCE_FILTER, category });
      assert.equal(results.length, counts[category]);
      assert.ok(results.every((experience) => experience.category === category));
    }
    assert.equal(Object.values(counts).reduce((sum, value) => sum + value, 0), EXPERIENCES.length);
    assert.ok(Object.values(counts).every((value) => value > 0), "no category chip may be empty");

    const coffee = filterExperiences(EXPERIENCES, { ...DEFAULT_EXPERIENCE_FILTER, query: "ca phe" });
    assert.ok(coffee.some((experience) => experience.slug === "ca-phe-nho-giot-cao-nguyen"));
  });

  it("returns related experiences without the item itself", () => {
    for (const experience of EXPERIENCES) {
      const related = getRelatedExperiences(experience.slug);
      assert.ok(related.length > 0);
      assert.ok(related.every((item) => item.slug !== experience.slug));
    }
    assert.deepEqual(getRelatedExperiences("does-not-exist"), []);
  });
});

describe("catalog view-model boundary", () => {
  it("maps an API destination and keeps provenance explicit", () => {
    const viewModel = fromCatalogDestination({
      id: "00000000-0000-4000-8000-000000000000",
      slug: "da-lat",
      name: "Da Lat",
      country_code: "VN",
      latitude: 11.9404,
      longitude: 108.4583,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
    });
    assert.deepEqual(viewModel, {
      slug: "da-lat",
      name: "Da Lat",
      source: "catalog-api",
      coordinates: { latitude: 11.9404, longitude: 108.4583 },
    });
  });

  it("does not invent coordinates", () => {
    const destination = getDestinationBySlug("da-lat");
    assert.ok(destination);
    assert.equal(fromDemoDestination(destination).coordinates, null);
    assert.equal(fromDemoDestination(destination).source, "demo");
  });
});
