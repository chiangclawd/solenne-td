# Working Rules for Claude

Instructions that persist across sessions for this project.

## Version bumping

**Every user-visible change must bump `package.json` version before the
commit, then be rebuilt so the injected `__APP_VERSION__` reflects it.**

- Patch bump (`2.2.x → 2.2.x+1`): UI tweaks, bug fixes, art polish,
  balance passes, single-level content.
- Minor bump (`2.x.y → 2.x+1.0`): new feature (e.g. new hero, new game
  mode, new world), new meta system.
- Major bump (`x.y.z → x+1.0.0`): breaking save-schema change or
  fundamental rewrite.

After any commit, **always report the resulting version** in the reply
using the format:

> **目前版號：`v{version} · build {YYYY-MM-DD}`**

The `__BUILD_DATE__` macro is wired via `vite.config.ts` and refreshes
automatically every build, so `npx vite build` after bumping the patch
is sufficient.

## Deploy pipeline

`git push origin main` triggers GitHub Actions → GitHub Pages at
https://chiangclawd.github.io/solenne-td/. No manual step.

PWA uses `registerType: 'autoUpdate'` + NetworkFirst for `index.html`
and `/levels/*.json`, so installed home-screen PWAs get new versions on
the very next app open (2 s network attempt, falls back to cache).

## Code style + safety

- Never skip git hooks (`--no-verify`, `--no-gpg-sign`) unless explicit.
- Never force-push or reset-hard without asking.
- Prefer `Edit` to `Write` when modifying existing files.
- Run `npx tsc --noEmit` before committing TS changes.
- Canvas 2D only — no WebGL, no external asset pipeline beyond Kenney
  images in `public/assets/kenney/`.

## Save data guarantees

Save lives in `localStorage` under `'td-solenne-save-v1'` with a
`migrate()` on load. Never ship a schema change that drops fields —
always additive.

## Scope

The game is **indie polish tier** (剛好商業質感). Prioritize:
readability on mobile → responsive HUD → art polish → new content.
Do not add complex engine features (pathfinding AI, network, multiplayer)
unless explicitly requested.

## Required reading before non-trivial changes

**Always consult `docs/DEV_NOTES.md`** before adding features or fixing
bugs in any of: iOS safe-area, PWA update semantics, canvas tile art,
save schema migration, hero combat, multi-path waves, or boss phases.
That file catalogs every trap we've already hit and the verified
solutions — checking it first saves re-debugging known issues.

**After landing a new bug fix or architectural choice**, append a new
entry to `docs/DEV_NOTES.md` in the matching section using the format:
情境 / 根因 / 解法 / 教訓. Keep the file alive — terse notes beat none.

**Before proposing new features**, check `docs/ROADMAP_SINGLEPLAYER.md`
for the existing plan — it ranks 10+ milestones by ROI and explicitly
lists things we're choosing NOT to do (online, gacha, multiplayer,
localization). If the user's request maps to an existing milestone,
implement it under that section's bucket. If it's truly new, propose
adding a line to the roadmap before coding.
