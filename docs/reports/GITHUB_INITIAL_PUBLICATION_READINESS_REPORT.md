# GitHub Initial Publication Readiness

Date: 2026-11-15 (Asia/Bangkok). Scope: audit, repository presentation, local commit and remote preparation. No actual push authorized or performed.

## Repository baseline and scope

- Branch: `main`.
- Original HEAD and verified H3 checkpoint: `3365ea33f340577779967d72e158172c1fad8d6c`, `docs(web): close post-0.4 image optimization evaluation`.
- H2: `13f37ffb6ffb31d88e5c3a233baea1896d9381d7`.
- H1: `99f749eff8aeccc199f38236019a96f5d5f3e570`.
- Starting working tree: only `?? docs/reports/assets/web-design-0-4.zip`; no tracked modifications or staged files.
- One worktree, no remote initially. Root guidance read; no application subtree was edited.

The actual source layout is `apps/web`, `apps/mobile`, **`services/api`**, and `packages/api-client`. Relevant source, generated contract, tests, manifests, workspace configuration, lockfiles, canonical SQL/migrations, assets and development scripts are tracked. The API client builds before the frontend, as the revised README explains. No placeholder implementation, architectural change or source omission was introduced.

## Reachable-history security review

The starting `main` reaches **19 commits, 754 Git objects and 454 unique blobs**. The audit enumerated objects with `git rev-list --objects main`, inspected their types/sizes with `git cat-file --batch-check`, and scanned every text blob from `git cat-file blob`. All 376 historical path names were also enumerated from commit history, separately from the unique-blob representative paths. Current tracked paths were reviewed independently.

Neither Gitleaks nor TruffleHog was installed. A standalone audit script outside the repository checked private-key headers, provider-token formats, JWT strings, credential assignments, credential-bearing URLs and confidentiality/service-account markers. Flagged content was manually reviewed in its configuration/test/documentation context. The scanner and machine-readable findings are retained at `F:/Coding/Adora System Mega Project/adora-publication-audit-20261115/`, not committed as application tooling.

**Outcome: no live credential or publication-blocking sensitive content identified.** Matches were development/CI connection examples in `.env.example`, CI, Alembic, configuration and database documentation, plus deliberate identity-test credentials and the local-only database smoke-test default. No secret values are reproduced here. No rotation is indicated for those examples; this is not a guarantee that heuristic scanning can detect every possible secret format.

No tracked or historical real `.env`, private-key file, service-account credential file, database dump, ZIP, dependency directory, virtual environment or Next build directory was identified. No private customer dataset or document marked confidential was identified. Historical reports contain local workstation paths/runtime details, and Git history contains its existing author metadata; these are part of the educational development record and are not represented as confidential credentials. Ignored private environment files were not copied into examples or staged.

The full-history publication boundary is explicit: a normal push publishes all reachable commits, including older file versions. New ignore rules do not remove historical content. No history rewrite, automatic untracking, reset, force push or cleanup of user files was performed.

## Size and binary review

At the starting checkpoint:

- Current tracked tree: **374 files, 63,937,254 bytes** of blob contents.
- Unique reachable blob contents: **66,105,793 bytes**; loose Git object storage reported **59.28 MiB**.
- Largest historical blob: **4,043,484 bytes**, `docs/reports/assets/web-design-0-3/desktop-destination-detail.png`.
- Large objects are primarily project screenshots/concepts and verification evidence, not dependencies or build outputs. Some duplicate captures add clone weight, but none approaches GitHub's large-file threshold. Existing evidence was preserved rather than rewritten or deleted.

GitHub documents warnings above 50 MiB and blocking above 100 MiB per regular Git file. No reachable blob approaches either threshold. [GitHub large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

The protected ZIP remains untracked and unchanged: SHA-256 `3D658B9DF1A2D4EE73EFD6EF868A8DA82807BCAB4994E4226E870EC7DAF1CF3D`. It is not included in publication scope, ignored as a shortcut, moved or deleted.

## Assets and licensing

The implementation notes record all three travel images as project-generated material created for ADORA, not copied reference-site photographs. Blueprint HTML uses CSS illustration placeholders and acknowledges public design references. Screenshots depict the project's own demonstration interface. No known third-party proprietary travel asset was identified in the reviewed scope.

No project-wide open-source license exists or was added. The existing `apps/mobile/LICENSE` retains Expo template attribution; it is not promoted into a blanket project license. The README now states this distinction and links image provenance. Font/dependency licenses remain applicable to their respective components. Final commercial image/brand review and any future selection of a project-wide license are owner decisions; this preparation grants no new reuse rights and claims no exclusive copyright registration for generated images.

## Publication changes

1. `README.md`: replaces the outdated Phase 1.0 presentation with accurate current frontend/demo/backend status, real stack and paths, frontend-first startup, API-client build prerequisite, optional backend/mobile setup, testing, roadmap and licensing/provenance notes. AI remains explicitly scripted demonstration behavior; no production AI or booking claim is made.
2. `.gitignore`: adds `.turbo`, `.vercel`, Python coverage output, common local credential containers, SQLite/dump files and a dedicated scratch directory. Existing `.env` exceptions and legitimate configuration remain preserved. New rules were checked with `git check-ignore`; no tracked file was automatically removed.
3. This minimal publication audit report.

Environment templates: **unchanged**. The existing root `.env.example` uses explicit local-development placeholders and covers the current backend and public frontend/mobile variables. The README explains Next.js/mobile environment-file locations and optional API URLs. No credential was copied from a private environment file; no variable or license was invented.

## Verification

All commands executed from the repository root:

| Check | Result |
|---|---|
| API-client `typecheck` | PASS |
| API-client `build` | PASS |
| `corepack pnpm@12.16.1 --filter @adora/web test` | PASS — 22 tests, 5 suites; zero failed/skipped |
| `corepack pnpm@12.16.1 --filter @adora/web lint` | PASS |
| `corepack pnpm@12.16.1 --filter @adora/web typecheck` | PASS |
| `corepack pnpm@12.16.1 --filter @adora/web build` | PASS — 20 routes generated; existing Google Fonts fetched with approved network access |
| Browser regression | Reused H3's three passing verifier runs; application source unchanged |
| `git diff --check` / staged whitespace check | PASS |
| Staged path/content review | Limited to README, ignore rules and this report; no credentials/ZIP/application artifacts |

Backend/database integration tests were not rerun; they require infrastructure and are not represented as passing. Production application code, dependencies, lockfiles, original metrics collector, image assets and historical baselines remain unchanged. No browser server was started for this publication preparation.

## Remote and dry run

Verified target: `https://github.com/BillNotAGamer/adora-system.git`. No origin existed, so `origin` was added with this URL; no other remote was replaced. Read-only `git ls-remote --heads <URL>` and `git -c safe.directory=<repository> ls-remote --symref origin` succeeded with no advertised refs. An initial sandbox network failure was retried with approved access; inaccessible output was never treated as proof of emptiness. Command-local Git trust configuration resolved the network-enabled shell's remote lookup discrepancy; global Git configuration was not changed.

`git -c safe.directory=<repository> push --dry-run origin main` succeeded against the H3 checkpoint, reporting `[new branch] main -> main`. This was a **dry run**, not a remote branch creation. The final publication commit is checked again in the handoff. Remote state may change after preparation; the manual command below assumes it remains compatible.

## Local commit and final handoff

Publication commit subject: `docs(repo): prepare adora for initial github publication`. It contains only the three publication-readiness files above. The full resulting commit SHA is supplied in the final handoff; a commit cannot embed its own hash without changing that hash. No amendment or push is performed.

Expected final status after the local commit:

```text
?? docs/reports/assets/web-design-0-4.zip
```

This is not a completely clean working tree: the protected untracked archive is intentionally preserved. No application source changes remain. H3 and earlier history remain intact; no sanitized snapshot or history rewrite is required by the findings of this audit.

Once the final dry run succeeds, the owner may manually execute:

```powershell
git push -u origin main
```

No publication-blocking issue was identified. Open-source license selection, commercial brand/asset approval, physical-device testing and future backend integration remain separate decisions, not completed work claimed by this report.
