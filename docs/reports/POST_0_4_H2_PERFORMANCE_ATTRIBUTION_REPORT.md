# Post Web Design 0.4 — H1 Hygiene and H2 Performance Attribution

Date: 2026-11-15 (Asia/Bangkok). Diagnostic work only; no H3 implementation or commit.

## Starting state and H1 hygiene

Verified `main` at `99f749eff8aeccc199f38236019a96f5d5f3e570`, following `dcaa27d`, `d62192c`, and `103dccf`. Root and web `AGENTS.md` were read. No global Git configuration was changed.

Initial status contained 15 modified tracked PNGs, four untracked hero captures, and the protected untracked ZIP. `git diff --stat` showed only binary screenshot changes. H1 report §9 explicitly records both legacy verifier runs and §12 identifies their unstaged screenshot side effects. The timestamps match those runs on November 14, 12:59–13:01. No application source or report change existed. This establishes provenance more strongly than filenames alone.

All 19 regenerated images were preserved outside the repository in `F:/Coding/Adora System Mega Project/adora-h2-scratch-20261115/h1-backup/`. Exactly these 15 tracked paths were restored from HEAD:

```text
docs/reports/assets/web-design-0-2/desktop-full-page.png
docs/reports/assets/web-design-0-2/desktop-hero.png
docs/reports/assets/web-design-0-2/mobile-full-page.png
docs/reports/assets/web-design-0-3/desktop-ai-planner-scripted.png
docs/reports/assets/web-design-0-3/desktop-destination-detail.png
docs/reports/assets/web-design-0-3/desktop-destinations.png
docs/reports/assets/web-design-0-3/desktop-experience-detail.png
docs/reports/assets/web-design-0-3/desktop-experiences.png
docs/reports/assets/web-design-0-3/mobile-ai-planner-scripted.png
docs/reports/assets/web-design-0-3/mobile-destination-detail.png
docs/reports/assets/web-design-0-3/mobile-destinations.png
docs/reports/assets/web-design-0-3/mobile-experience-detail.png
docs/reports/assets/web-design-0-3/mobile-experiences.png
docs/reports/assets/web-design-0-3/mobile-trip-detail.png
docs/reports/assets/web-design-0-3/mobile-trips.png
```

The four untracked `1024-hero.png`, `1920-hero.png`, `360-hero.png`, and `768-hero.png` files were moved from the 0.2 asset directory to the backup. No broad directory restoration was used. Status before H2 was exactly:

```text
?? docs/reports/assets/web-design-0-4.zip
```

Protected archive SHA-256: `3D658B9DF1A2D4EE73EFD6EF868A8DA82807BCAB4994E4226E870EC7DAF1CF3D` (19,911,302 bytes).

Both legacy verifiers already select `process.env.ADORA_VERIFY_OUTPUT` before their normal report asset directory. Future disposable runs should set, for example:

```powershell
$env:ADORA_VERIFY_OUTPUT = 'F:\Coding\Adora System Mega Project\adora-h2-scratch-20261115\legacy-verification'
node scripts/verify_homepage.mjs
node scripts/verify_web_0_3.mjs
Remove-Item Env:ADORA_VERIFY_OUTPUT
```

Neither legacy verifier was edited or rerun in H2.

## Evidence and methodology

Reviewed Package E's final report, performance-comparison JSON, verification-results JSON, immutable A0 JSON, final v1.1 approval, Reveal, hero, motion CSS, and the original collector. Package E's historical +132ms homepage LCP and +65/+81ms homepage/destination TBT differences establish priorities, not causation. This experiment uses H1 as its own current control; historical datasets were not overwritten or treated as matched current samples.

A detached worktree at H1 was created at `adora-h2-scratch-20261115/source`, outside active main. Existing dependency directories were shared through directory junctions; the existing API-client build was copied. No dependency installation or lockfile change occurred. pnpm rejected a junction as its task-state directory, so builds used the existing Next CLI directly. Turbopack initially could not resolve dependencies outside the worktree root; every variant used the identical scratch-only `turbopack.root: "F:/Coding/Adora System Mega Project"`. This common root changes build paths/chunk naming relative to the original main build and limits direct historical byte comparisons, but is held constant within H2.

Production build command (all variants):

```powershell
node apps/web/node_modules/next/dist/bin/next build apps/web
```

All accepted A, B, C, D and repeat-control builds compiled, typechecked, and generated 20 routes successfully. Google Fonts access required an elevated network-enabled build after the sandbox fetch failed. No fallback font was substituted. Servers used the existing CLI's `next start --hostname 127.0.0.1 --port 3100`. FastAPI stayed offline.

The original collector supports `--runs`, `--output`, `--label`, `--baseline-sha`, and `--docs-sha`, but no route/profile selectors. A scratch copy `scripts/h2_metrics.mjs` adds only mobile/route selection, omission of unrelated trusted-interaction tests, a 45-second CDP request bound, per-run OS CPU time deltas, and raw LongTask entries. Its metric calculations and collection windows are unchanged. The retained collector's metadata still declares the original complete route/profile inventory; the actual `mediansByRouteAndProfile` and `rawSamples.routes` identify the measured subset. No desktop result is claimed.

An elevated one-run homepage smoke completed with all metric fields and browser cleanup. An earlier sandbox smoke was interrupted after its browser disappeared without an artifact; it is excluded. Full runs began only after the successful smoke. One attempted repeat-control run was also interrupted and excluded: an elevated Git restore hit an ownership check and the shell continued to build. The hero was restored directly and source equality checked before rebuilding the accepted repeat control. Command-local `safe.directory` was used where necessary.

Common environment:

- Windows 10.0.26100 x64; Intel i7-12700H, 20 logical CPUs, 31.7 GiB RAM.
- Node v24.19.0; pnpm 12.16.1; Next 16.4.3; React 19.3.0.
- Chrome/157.0.8103.78, CDP 1.3, V8 15.7.112.43 throughout accepted runs.
- 390×844 viewport, device scale 2, mobile emulation, 4× CPU slowdown.
- Network latency 150ms; download 200,000 B/s (1.6 Mbps); upload 93,750 B/s.
- Fresh BrowserContext per run, browser cache disabled/cleared; production server image cache retained consistently. The smoke warmed the homepage path. First-use server work and process warmup remain possible confounders.
- Sequential order A → B → C → D → A-repeat. No concurrent build or other agent workload during capture. External workstation workloads were not terminated.

Commands used the form `node scripts/h2_metrics.mjs --runs 5 --output '../A.json' --label H2-A --baseline-sha 99f749eff8aeccc199f38236019a96f5d5f3e570`. A/B selected `/`, destination detail, experience detail, and planner. C/D selected `/` and planner with `$env:H2_ROUTES='/,/ai-planner'`: their target mechanism exists only on the homepage, so unchanged detail routes were not redundantly collected. The repeat control uses that same two-route selection.

LCP is the buffered observer's last candidate before scrolling. TBT here means the historical collector's sum of `max(LongTask duration - 50ms, 0)` across its full initial-load and scroll window; it is not a Lighthouse FCP-to-TTI calculation. CLS and rAF windows are also unchanged. Raw first LongTask duration is a bootstrap/hydration **proxy**, not a measured React hydration span: no trace/call stack attribution was captured, so its exact ownership remains unverified.

## Exact ablations and isolation

| Variant | Only target modification beyond common configuration | Scope and confounding factors |
|---|---|---|
| A | None; H1 target files unchanged | Current control, not A0 |
| B | After `if (!el) return`, add `if (!document.documentElement.hasAttribute("data-h2-keep-reveal-setup")) return` inside Reveal's effect | Retains component, hooks, markup, children, dimensions and original effect body in bundle. Attribute is absent. Avoids setup, callbacks, listeners and scroll reveals; content remains visible. This estimates the lifecycle path, not constructor cost alone. |
| C | Add `style={{ animation: "none" }}` to the existing homepage hero Image | Same image, priority, sizes, text, Reveal and grain. Tiny SSR style serialization change; no client JS transfer change. |
| D | Add `style={{ mixBlendMode: "normal" }}` to the existing hero-grain div | Same noise overlay, opacity, hero image/settle, layout and Reveal. Intentionally visually different, not approved production art direction. |

Patches `B.patch`, `C.patch`, `D.patch`, `common-worktree-config.patch`, and `collector-instrumentation.patch` are preserved in the scratch directory. Each target file was restored between variants. Target files were checked equal to H1 for the accepted control repeat. `applicationByteIdentical: false` in collector output is expected because of the common worktree configuration (and the target modification in ablations), not evidence of an active-main mutation.

## Raw measurements and comparisons

All arrays list five runs in execution order. Units are milliseconds except compressed JavaScript bytes. Deltas compare each median with initial A for the same route; they are descriptive, not statistically conclusive.

| Variant / route | LCP samples | Median | Δ / % | TBT samples | Median | Δ / % | JS bytes |
|---|---|---:|---:|---|---:|---:|---:|
| A / | 1596,1504,1524,1516,1500 | 1516 | — | 571,529,548,599,554 | 554 | — | 197900 |
| B / | 1620,1476,1476,1460,1492 | 1476 | -40 / -2.64% | 608,524,507,507,521 | 521 | -33 / -5.96% | 197938 |
| C / | 1568,1464,1416,1496,1476 | 1476 | -40 / -2.64% | 577,482,490,526,508 | 508 | -46 / -8.30% | 197900 |
| D / | 1592,1496,1500,1492,1464 | 1496 | -20 / -1.32% | 644,578,516,536,498 | 536 | -18 / -3.25% | 197900 |
| A destination | 2984,2960,2968,2964,2976 | 2968 | — | 458,485,467,472,511 | 472 | — | 203875 |
| B destination | 2956,2976,3000,2980,2956 | 2976 | +8 / +0.27% | 495,505,508,479,480 | 495 | +23 / +4.87% | 203913 |
| A experience | 1972,1988,2004,2060,1988 | 1988 | — | 440,433,378,413,424 | 424 | — | 203875 |
| B experience | 1948,2000,1996,1980,2036 | 1996 | +8 / +0.40% | 423,388,437,421,413 | 421 | -3 / -0.71% | 203913 |
| A planner | 892,872,912,920,904 | 904 | — | 208,207,229,240,240 | 229 | — | 174724 |
| B planner | 896,888,900,880,884 | 888 | -16 / -1.77% | 221,203,262,218,201 | 218 | -11 / -4.80% | 174743 |
| C planner | 900,980,892,892,932 | 900 | -4 / -0.44% | 247,279,237,218,263 | 247 | +18 / +7.86% | 174724 |
| D planner | 916,912,876,908,904 | 908 | +4 / +0.44% | 232,246,243,240,219 | 240 | +11 / +4.80% | 174724 |

Route names above abbreviate `/destinations/da-lat`, `/experiences/ca-phe-nho-giot-cao-nguyen`, and `/ai-planner`.

### LongTasks, CPU and variation

| Variant / route | Total LongTask time, five samples | First LongTask duration, five samples | CPU busy %, five samples |
|---|---|---|---|
| A / | 671,629,648,699,654 | 518,478,505,510,487 | 13.65,9.99,10.45,10.21,10.43 |
| B / | 708,624,607,607,621 | 534,446,459,464,485 | 14.09,12.78,10.10,11.36,11.02 |
| C / | 677,582,590,626,608 | 521,446,454,496,463 | 14.38,8.88,9.28,10.45,10.92 |
| D / | 744,678,616,636,598 | 543,500,471,497,435 | 16.72,11.26,9.70,9.08,10.99 |
| A destination | 558,585,567,572,611 | 412,438,433,423,459 | 11.51,10.54,10.38,9.97,9.10 |
| B destination | 595,605,608,579,580 | 466,471,471,455,452 | 9.95,10.11,9.56,9.56,9.70 |
| A experience | 540,533,478,513,524 | 392,400,330,374,390 | 10.46,9.79,9.11,9.69,11.06 |
| B experience | 523,488,537,521,513 | 345,362,377,366,384 | 10.80,10.07,12.18,10.14,9.29 |
| A planner | 308,307,329,340,340 | 183,179,185,213,203 | 10.33,10.71,9.72,10.16,10.64 |
| B planner | 321,303,362,318,301 | 194,178,207,181,179 | 9.03,9.83,10.31,10.29,10.18 |
| C planner | 347,379,337,318,363 | 193,246,184,190,241 | 11.99,10.52,8.98,9.36,11.02 |
| D planner | 332,346,343,340,319 | 206,215,183,219,195 | 8.79,9.59,9.44,10.12,9.60 |

CPU is aggregate busy OS time divided by total OS CPU time during each whole route run, including the benchmark itself. It cannot identify competing process load or instantaneous contention during hydration. No CPU normalization or outlier exclusion was performed. First runs frequently have higher CPU and timing values, so pooled five-run medians alone do not eliminate warmup bias.

All completed A–D samples preserve LCP element identity: homepage `img.-z-30.object-cover.object-[61%_center].sm:object-center`, destination `img.-z-30.object-cover`, experience `img.object-cover`, planner `p`. Source image identities are retained in raw JSON. Layout heights are unchanged per route (6812, 7355, 4305 and 844 px respectively). All CLS samples are 0; all rAF p95 values are 4.3ms, with zero sampled intervals above 50ms. All runtime/observer error arrays are empty. Headless rAF measures scheduling, not physical mobile GPU frame pacing. Individual LongTask start times and durations, per-script transfer details, and full frame summaries remain in raw samples.

## Attribution and H3 assessment

**Measured:** B's homepage TBT median falls by 33ms, but destination rises by 23ms and experience changes by only -3ms. B's compressed JS grows by 38 bytes on the three content routes and 19 bytes on planner; this is not a significant bundle-removal confound. Content geometry is identical, although below-fold reveal behavior is deliberately bypassed. First LongTask and TBT distributions overlap substantially.

**Interpretation:** These data do not support treating per-instance Reveal setup as the established cause of the historical +65/+81ms regressions. The homepage result is a correlation consistent with some lifecycle cost; the destination result fails to reproduce a benefit where the original hypothesis predicted one. A shared-observer rewrite is not justified by this experiment. It risks SSR visibility, Activity restoration, Strict Mode, reduced motion, fast-scroll safety, focus handling, and cleanup for an unproven gain. A future investigation should first capture CPU traces and instrument effect/callback durations in an isolated copy, then use reversed or randomized A/B blocks; retain the full correctness suite if any refactor is later authorized.

**Measured:** Disabling image settle changes homepage median LCP by -40ms (-2.64%); disabling grain blend changes it by -20ms (-1.32%). The same LCP image remains selected. C/D JavaScript transfer equals A. Homepage LCP ranges overlap (A 1500–1596ms; C 1416–1568ms; D 1464–1592ms), and unchanged planner TBT also varies by -11 to +18ms across B–D.

**Interpretation:** Neither hero ablation establishes a substantial LCP bottleneck or explains the entire historical +132ms delta. Preserve the approved cinematic treatment pending stronger evidence. GPU/compositor expense on a physical mobile device is still an unverified hypothesis; this headless experiment cannot rule it out. Do not ship either visually changed ablation as an optimization.

## Independent destination-image backlog

`dalat-pine-trail.webp` remains unchanged at 380,818 bytes (~371.9 KiB). Existing evidence records a roughly 290.7 KiB optimized 828px variant and destination LCP near three seconds before motion existed. Current A destination LCP is 2968ms and B is 2976ms, which is consistent with an independent transfer bottleneck; these ablations do not prove the exact transfer/decode/render split.

A safe H3 candidate is a separate asset experiment: preserve the original, create controlled resolution/quality/encoding candidates in a disposable copy, compare 390px and large-desktop crops side by side (pine needles, mist gradients, path detail, banding), measure actual optimized response sizes and image decode/network timing, and rerun matched five-cold-run LCP blocks with unchanged motion and Next image configuration. Retain only a visually approved candidate with repeatable benefit. No re-encoding, image replacement, or image-setting change was made in H2.

## Evidence retention and finalization

Machine-readable data lives separately at `F:/Coding/Adora System Mega Project/adora-h2-scratch-20261115/`: `smoke.json`, `A.json`, `B.json`, `C.json`, `D.json`, `A-repeat.json`, and derived `summary.json`. The copied collector, summary script, experimental patches, and H1 screenshot backups are retained there. These are local diagnostic artifacts, not historical baseline replacements.

## Repeat control and uncertainty assessment

The accepted A-repeat was rebuilt after verifying zero target-file differences from H1. Five more independent cold runs were collected per selected route:

| Route | LCP samples / median | LCP Δ vs initial A | TBT samples / median | TBT Δ vs initial A |
|---|---|---|---|---|
| / | 1712,1488,1440,1504,1500 / **1500** | -16ms / -1.06% | 585,538,500,539,544 / **539** | -15ms / -2.71% |
| planner | 896,896,892,880,876 / **892** | -12ms / -1.33% | 209,217,210,208,226 / **210** | -19ms / -8.30% |

| Route | Total LongTask time | First LongTask duration | CPU busy % |
|---|---|---|---|
| / | 685,638,600,639,644 | 541,496,457,502,494 | 14.25,11.55,10.57,8.75,9.33 |
| planner | 309,317,310,308,326 | 187,192,180,179,178 | 8.68,8.56,8.46,8.08,8.66 |

JavaScript transfer remains 197900/174724 bytes; LCP identity, geometry, zero CLS, 4.3ms frame p95, zero frames above 50ms and empty error arrays also remain unchanged.

Against the later A-repeat rather than initial A, B/C/D homepage LCP differences are only -24/-24/-4ms, and TBT differences are -18/-31/-3ms. These are **alternative reference comparisons**, not normalized estimates. The controls demonstrate session variation even with unchanged source. No five-run result is claimed statistically conclusive, and no subtraction of planner timing is used to invent an adjusted effect.

The measured lifecycle and hero differences are too small or inconsistent to establish the historical component-level causal attribution. The destination reversal, overlapping sample ranges, first-run bursts, whole-run aggregate CPU sampling, and fixed variant order remain limitations. The repeated control improves confidence about scale but does not replace randomized paired ablation blocks or a main-thread trace. Physical mobile GPU cost and exact hydration ownership remain unverified. H2 therefore ends inconclusive for causal attribution, with a clear decision to defer motion refactoring and preserve the approved treatment. If a later phase still needs attribution, run reversed A/B and A/C blocks under comparable idle conditions and collect trace-backed effect/callback/render spans before changing production architecture.

Total accepted collection: **70 cold route runs** (20 A + 20 B + 10 C + 10 D + 10 A-repeat), plus **one successful smoke run**. Interrupted attempts contributed no accepted samples. All accepted raw cells contain five samples with LCP present and empty runtime/observer errors. No new production feature, H3 optimization, image change, dependency or commit was made.

## Final Git and resource integrity

The detached experimental worktree was removed after validation and evidence retention. Its three dependency junctions were explicitly unlinked first without deleting their shared targets. The scratch source/build directory was then removed through `git worktree remove --force` against the verified exact path. All benchmark servers and browser sessions terminated. Two exact disposable Chrome profiles left by interrupted attempts (`adora-motion-metrics-chrome-R0UstI`, `adora-motion-metrics-chrome-SGsqbO`) were inspected and removed from the current user's Temp directory; no unrelated profile or process was removed. Their raw experiment results and H1 screenshot backups remain recoverable in scratch; the disposable browser caches are not retained.

Final `git worktree list` contains only the active repository. Active HEAD remains `99f749eff8aeccc199f38236019a96f5d5f3e570` on `main`. No tracked path differs from HEAD and nothing is staged. The exact remaining status is:

```text
?? docs/reports/POST_0_4_H2_PERFORMANCE_ATTRIBUTION_REPORT.md
?? docs/reports/assets/web-design-0-4.zip
```

Preserved hashes (SHA-256):

| Artifact | Hash |
|---|---|
| Original collector | `E4732607FE6508BEC1BECFE86C1A734182C3A7AA07A70B7FDC63675CD97A43FB` |
| Original A0 JSON | `545961C66F93FD8B62E7A523ADF30C359235CA43191394C399791A0081A7AB10` |
| Active Reveal | `69E571860992E9192653B54D2664438E8BB477ABE56B80F0422E8C7180572501` |
| Active hero | `293281015D23917DE426CB0D080500C7C1B8B663BE75C025AC580D5FC88BA036` |
| Active globals.css | `17F1D7228E42F86ACD9D150D35426F4CC0A7356A136C9CA57C62FA1C2CDC2F2A` |

The archive hash remains the value recorded in the hygiene section. Historical reports, baseline collector/data, application source, dependencies, and lockfile remain unchanged. No commit or remote push occurred. The H2 report intentionally remains uncommitted for review.

**Final verdict:** H2 — INCONCLUSIVE / FURTHER CONTROLLED MEASUREMENT REQUIRED
