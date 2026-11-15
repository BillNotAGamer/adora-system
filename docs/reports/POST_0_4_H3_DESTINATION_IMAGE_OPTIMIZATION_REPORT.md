# Post-0.4 H3 — Destination Image Optimization Evaluation

Date: 2026-11-15, Asia/Bangkok.

## 1. Executive decision

**Retain the original photograph.** Six dimension-preserving WebP candidates were generated, native crops inspected, and the conservative quality-90 candidate tested in 60 cold route runs using balanced A → B → B → A blocks. The candidate reduced the actual 828px WebP body by only **1.69%**, with pooled median LCP improvements of **24ms** on `/destinations` and **18ms** on `/destinations/da-lat`. These fall well below the preferred 100ms threshold and do not justify another lossy encoding generation. More aggressive candidates visibly soften fine foliage and ground texture. No production asset or source file was changed.

All seven required regression gates passed. This closes the targeted evaluation as a measured no-change outcome; it does not claim a new performance optimization or resolution of H2's motion-runtime attribution uncertainty.

## 2. Repository and documentation baseline

Initial branch: `main`. Initial HEAD: `99f749eff8aeccc199f38236019a96f5d5f3e570`. Recent lineage: H1 `99f749e`, Package E `dcaa27d`, evidence checkpoint `d62192c`. Initial status was exactly the approved untracked H2 report and protected ZIP; no tracked changes existed.

Root/web AGENTS instructions, the approved H2 report, Package E report/comparison, A0 baseline, final v1.1 approval, destination pages, image references, Next configuration, collector and three verifiers were reviewed. The H2 report matches the reviewed diagnostic findings and was committed unchanged in **`13f37ffb6ffb31d88e5c3a233baea1896d9381d7`**, subject `docs(web): record post-0.4 performance attribution findings`. No experimental patches or ZIP were included.

## 3. Original source audit

- Tracked path: `apps/web/public/images/home/dalat-pine-trail.webp`.
- Original bytes: **380,818**; SHA-256: `358a9d042fd417656464db896e3a1cb58e8c580428051b5a76417ca6882a19d6`.
- Dimensions: **1086×1448**, exactly **3:4**. RGB, 8-bit, sRGB interpretation, no alpha, no embedded ICC profile.
- Container: lossy WebP with one `VP8 ` chunk of 380,798 bytes; 20 bytes container overhead. No EXIF, XMP or ICC chunks to strip. Original encoder quality cannot be recovered reliably from this file and is not asserted.
- Original bytes are preserved externally as `adora-h3-scratch-20261115/original.webp`.

References occur directly in `components/home/destination-story.tsx` and in the destination/experience fixture modules. Those fixtures feed destination index/detail cards, experience surfaces, and related trip surfaces. This is a shared asset, so a replacement could affect more than the two benchmark routes.

The destination detail uses `fill`, `preload`, `sizes="100vw"`, `object-cover` and the existing image position. The index uses `fill`, `preload`, `sizes="(max-width: 1023px) 100vw, 66vw"`, with responsive aspect ratios. Homepage use remains lazy below the fold. All remain unchanged. No dimension reduction or upscaling was introduced.

## 4. Candidate generation and objective metrics

Existing transitive Sharp **0.35.5**, libvips **8.18.7**, libwebp **1.6.0** were used without installing dependencies. Each candidate decodes the original then applies `.webp({quality, effort: 6})`, retaining 1086×1448 dimensions. No sharpening, color manipulation, generative processing, or resizing was used.

| Quality | Source bytes | PSNR vs decoded original (dB) | Local 828px/q75 re-encode estimate (bytes) |
|---|---:|---:|---:|
| Original | 380818 | reference | 154432 |
| 95 | 507216 | 43.29 | 152726 |
| 90 | 445054 | 41.36 | 151816 |
| 80 | 340910 | 38.56 | 156304 |
| 70 | 254186 | 33.84 | 151732 |
| 60 | 212870 | 32.51 | 143906 |
| 40 | 157362 | 30.93 | 137328 |

PSNR is a decoded-RGB reference comparison, not a perceptual-equivalence guarantee. SSIM was not computed. Local estimates are not represented as HTTP measurements for unbenchmarked candidates. Quality 90 was selected provisionally for the controlled experiment because it conservatively preserves texture; larger source size was not used as a rejection shortcut. Quality 80's estimated responsive output actually grows. Lower qualities produce smaller sources but diminishing responsive savings and more visible texture changes.

Full encoder versions, metadata, candidate SHA-256 values, and original checksum are in [candidate-manifest.json](assets/post-0-4/h3/candidate-manifest.json). Tested candidate SHA-256: `ddbd60f70cd2cd81c19a9b53b11662c0815e6e0de8d90f5c8c7019158ae4d403`.

## 5. Visual evaluation

Native 350×500 crops at source position (500,650) compare original, q90, q80, q70 from left to right in [native-quality-crops.png](assets/post-0-4/h3/native-quality-crops.png). Additional q60/q40 comparisons remain in scratch. Pine needles, grasses, path texture, distant forest, lake mist and shadow transitions were inspected. Q90 is visually close in the inspected crops; q70 and below progressively smooth fine vegetation and path detail. No candidate was approved by PSNR alone.

The actual destination-detail application was captured for original and q90 at **390×844, 768×1024, 1440×900, 1920×1080**, device scale 2, with identical CSS, crop, overlays, positioning, motion, and viewport per pair. Full device-pixel captures remain in scratch. Compact reviewed comparisons show original left / q90 right:

- [Mobile comparison](assets/post-0-4/h3/mobile-visual-comparison.png).
- [Desktop comparison](assets/post-0-4/h3/desktop-visual-comparison.png).

Composition, fog gradients, highlights, dark forest treatment, typography and layout remain coherent across the inspected widths. No noticeable color-profile shift or new banding was observed for q90. Desktop evidence is reduced for compact storage; original device-scale captures and native crops were retained for closer review. This is a visual engineering assessment, not a mathematical proof of equivalence or a physical-device display test.

## 6. HTTP delivery and cache validity

Two disposable production-build copies were created outside main (`adora-h3-scratch-20261115/A` and `/B`) from the same successful production build. Identical build ID: `_gz3CXmanAJEOOpyxyORp`. Public image bytes were the sole application difference; Next configuration, compiled JS, CSS, page markup, preload/sizes and dependencies were identical. No source patch or configuration workaround was needed. Sharing the compiled build is valid here because the image is addressed through a public URL rather than statically imported into the bundle.

The `.next/cache` directory was **excluded** from each copy, creating independent empty optimizer caches. Each block started one server at `127.0.0.1:3100`, fetched each identical image query twice, and verified status, source SHA, response type, bytes, body SHA and cache status. First blocks recorded MISS then HIT; every timed block used the same prewarmed server-cache policy. Browser cache was disabled/cleared independently for every cold run. Repeated B/A blocks reused their own isolated caches and repeated the same warm-up requests. No original/candidate cache directory was shared.

Query form: `/_next/image?url=%2Fimages%2Fhome%2Fdalat-pine-trail.webp&w=828&q=75`, `Accept: image/webp`. Both browser target routes selected this same 828px query and retained the same LCP element and geometry.

| Query width | Original HTTP body bytes | q90 HTTP body bytes | Content type |
|---|---:|---:|---|
| 640 | 103078 | 102502 | image/webp |
| 828 | **154432** | **151816** | image/webp |
| 1080 | 222680 | 221014 | image/webp |
| 1920 | 297638 | 287256 | image/webp |

**Historical distinction:** 297,638 bytes was described as an 828px response in earlier context. This session reproduces that exact size for the **1920px** query, not 828px. Historical artifacts were not edited; the earlier request provenance is not retrospectively asserted. Current decisions use actual matched requests. Without WebP negotiation, a separate exploratory request returned JPEG; that is excluded from the matched WebP comparison.

Browser Resource Timing confirms original/candidate 828px encoded bodies of 154432/151816 bytes (transferSize includes 300 additional bytes in Chrome's accounting). [Transfer evidence](assets/post-0-4/h3/transfer-comparison.json) retains exact source/response hashes. Example original detail request: start 184.1ms, responseStart 821.2ms, responseEnd 2924.3ms, duration 2740.2ms. Network scheduling and competing initial resources contribute; body bytes alone do not predict LCP. Image decode spans were not exposed by this collector; no decode-cost claim is made.

## 7. Benchmark protocol and environment

The original collector is immutable. A scratch copy of the H2 instrumented collector adds destination-image Resource Timing and points repository metadata reads at main. LCP, CLS, LongTask/TBT and JS-transfer calculations remain the original definitions. The `applicationByteIdentical` flag describes active-main tracked source; experimental asset identity is established separately by source and response checksums.

Windows 10.0.26100 x64; i7-12700H, 20 logical CPUs, 31.7 GiB RAM. Node v24.19.0, pnpm 12.16.1, Next 16.4.3, React 19.3.0. Chrome/157.0.8103.78 throughout. Mobile 390×844, DPR 2, 4× CPU, 150ms latency, 200000 B/s download, 93750 B/s upload. FastAPI remained offline.

Four sequential blocks **A → B → B → A**, each with five fresh BrowserContext runs on `/destinations`, `/destinations/da-lat`, `/ai-planner`: **60 accepted runs**, ten per route/variant. No concurrent benchmark or build occurred during collection. CPU busy time is per-run aggregate OS time, including the experiment; it ranged from 8.38% to 18.36%. First runs often cost more. No CPU normalization, excluded sample, or invented adjustment was used. All raw CPU samples are committed in compact comparison JSON.

LCP is the last observer candidate before the deterministic scroll pass. TBT is the historical collector's sum of LongTask duration beyond 50ms across its full observation window, not Lighthouse FCP-to-TTI TBT. LongTask duration arrays remain in compact evidence. Separate React hydration spans were not measured. Windows headless frames are not physical mobile GPU telemetry. Five runs per block are engineering evidence, not statistical significance.

Commands: `node benchmark.mjs` orchestrated sequential production servers and `node h3_metrics.mjs --runs 5 --output <scratch/block-N-V.json> --label H3-N-V --baseline-sha 99f749eff8aeccc199f38236019a96f5d5f3e570`. Original collector/baseline JSON were not overwritten. `node capture.mjs` subsequently captured the actual application separately from benchmarking.

## 8. Raw LCP samples and distribution

All units milliseconds; each row contains five independent cold samples in run order.

| Block | Route | Raw LCP | Median TBT |
|---|---|---|---:|
| 1 A | index | 3052,2996,2992,2996,3004 | 339 |
| 1 A | detail | 2944,2960,2956,2972,2968 | 482 |
| 1 A | planner | 908,876,884,932,912 | 215 |
| 2 B | index | 3036,2972,2964,2988,2964 | 357 |
| 2 B | detail | 2944,2952,2948,2936,2972 | 492 |
| 2 B | planner | 896,912,884,896,872 | 228 |
| 3 B | index | 2972,2984,2968,2972,2972 | 369 |
| 3 B | detail | 2948,2952,2932,2944,2968 | 500 |
| 3 B | planner | 920,888,896,884,928 | 250 |
| 4 A | index | 2980,2992,3008,2988,2996 | 373 |
| 4 A | detail | 2968,2956,2968,2988,2964 | 478 |
| 4 A | planner | 884,900,892,872,876 | 216 |

| Route | Pooled A/B median LCP | Delta | A/B range | Pooled A/B median TBT |
|---|---|---|---|---|
| index | 2996 / 2972 | -24 (-0.80%) | 2980–3052 / 2964–3036 | 363.5 / 360.5 |
| detail | 2966 / 2948 | -18 (-0.61%) | 2944–2988 / 2932–2972 | 480 / 496 |
| planner control | 888 / 896 | +8 (+0.90%) | 872–932 / 872–928 | 215.5 / 236 |

Index medians are 2996 → 2972 → 2972 → 2992; detail 2960 → 2948 → 2948 → 2968. The small LCP direction is consistent across blocks, but the magnitude fails the preferred 100ms threshold. Distributions overlap; no statistically conclusive causal claim is made. Control TBT varies despite unchanged code; do not attribute its variation to this image.

All 60 CLS values are **zero**. LCP identities stay `img.object-cover` on index and `img.-z-30.object-cover` on detail, with the same source URL/query; planner stays its original paragraph candidate. All runtime and observer error arrays are empty. JS transfer is exactly **203871 bytes** for both destination routes and **174717 bytes** for planner across A/B. No JS, CSS or motion optimization is hidden in the comparison. [Performance comparison](assets/post-0-4/h3/performance-comparison.json) contains per-block raw LCP/TBT, LongTasks, CPU, JS, CLS and identities; full request timing/geometry/raw collector files remain externally retained.

## 9. Production decision

Q90 passes the inspected visual quality assessment, but its mobile transfer reduction is only 2616 bytes (1.69%) and LCP improvement is only 18–24ms. Its source grows to 445054 bytes. Under the predefined conservative decision policy, these benefits do not justify replacing the photograph. Lower-quality candidates were not approved merely to force a byte target; no performance result is asserted for them.

**Production modifications: none.** The original SHA and dimensions remain unchanged. Both target routes remain near three seconds in this lab; no sub-2.5-second result is claimed. The measured no-change outcome is valid and preferable to weakening visual/performance criteria.

## 10. Seven regression gates

| Gate / command | Actual result |
|---|---|
| `corepack pnpm@12.16.1 --filter @adora/web test` | PASS — 22 tests, 5 suites; zero failed/skipped |
| `corepack pnpm@12.16.1 --filter @adora/web lint` | PASS |
| `corepack pnpm@12.16.1 --filter @adora/web typecheck` | PASS |
| `corepack pnpm@12.16.1 --filter @adora/web build` | PASS after network-enabled retry for existing Google Fonts; 20 routes generated |
| `node scripts/verify_web_0_3.mjs` | PASS — exit 0; full log retained |
| `node scripts/verify_homepage.mjs` | PASS — exit 0; full log retained |
| `node scripts/verify_web_0_4.mjs` | PASS — exit 0; Packages A/B/C/D/E and H1 assertions retained |

All browser gates used the production server at 127.0.0.1:3100 with API offline and `ADORA_VERIFY_OUTPUT` pointing outside the repository. No tracked historical screenshot was regenerated. The initial sandbox build failed fetching existing fonts; the network-enabled retry succeeded. An attempted start before that successful build correctly failed and was not reported as a pass. No assertions were weakened. Full gate5/6/7 logs are in scratch rather than truncated report output.

## 11. Limitations and H2 continuity

This tests one conservative performance candidate, with six candidates explored for encoding/quality. More aggressive candidates have estimates and visual observations, not claimed benchmark results. Original/candidate app captures cover detail at four widths; the index additionally passed the existing six-width regression verifier. Color judgment is limited to these rendered captures and native crops. Physical displays/devices, decode traces, Lighthouse, screen-reader hardware and field telemetry were not tested. A different encoder or a future AVIF-specific study might behave differently; no library/configuration change is authorized here.

H2 remains **inconclusive for detailed motion-runtime attribution**. This image experiment provides no justification for a shared Reveal observer, removal of image settle, or removal of hero grain. All those mechanisms remain intact.

## 12. Evidence, cleanup, and Git closure

Compact committed evidence is under `docs/reports/assets/post-0-4/h3/`: candidate manifest/checksums, transfer comparison, mobile/desktop application comparisons, native crops, performance comparison, and final-decision JSON. Large raw collector blocks, scripts, full-resolution screenshots, original and candidate images remain at **`F:/Coding/Adora System Mega Project/adora-h3-scratch-20261115/`**. H2 scratch data was not edited.

Disposable A/B production copies were removed after recording their identical build ID and evidence; dependency junctions were explicitly unlinked before deleting those exact directories. Dedicated visual Chrome profiles were removed. Sequential servers/browser sessions ended. No experimental worktree was created; `git worktree list` still contains only main. Raw image/evidence copies are retained for recovery.

H2 commit: `13f37ffb6ffb31d88e5c3a233baea1896d9381d7`. H3 documentation commit subject: `docs(web): close post-0.4 image optimization evaluation`; it contains only this report and compact H3 evidence. Its immutable full SHA is supplied in the final handoff and retrievable with `git log -1 --format=%H` after committing; a commit cannot embed its own SHA without changing it. No amendment or push is performed.

Final checks require zero tracked application/dependency/lockfile changes, unchanged original collector and baseline, and the protected ZIP remaining untracked. The expected final status after the documentation commit is exactly:

```text
?? docs/reports/assets/web-design-0-4.zip
```

The ZIP SHA-256 remains `3D658B9DF1A2D4EE73EFD6EF868A8DA82807BCAB4994E4226E870EC7DAF1CF3D`. No whole-tree-clean claim is made. Frontend hardening can close with this explicitly documented no-change decision; no next product phase is started.

**POST-0.4 H3 — NO SAFE IMPROVEMENT / ORIGINAL ASSET PRESERVED**
