# Beta metrics — PostHog dashboard

Suggested panels: **ACTIVE BETA PLAYERS** (`app_started`, unique anonymous users), **RUNS** (`run_started`), **AVG RUN DURATION** (`run_finished.durationSeconds`), **SECOND RUN RATE**, **WORLD VISITS**, **SECRET WORLD DISCOVERY**, **BOSS ATTEMPTS**, **BOSS WIN RATE**, **MOST PREVIEWED SKINS**, **PETS UNLOCKED**, and **DEATH REASONS**.

## Definitions

- **Play rate:** sessions with `run_started` / sessions with `main_menu_viewed`.
- **Second Run Rate:** sessions with 2+ `run_started` / sessions with 1+ `run_started`. A single client instance cannot identify cross-device daily active users; do not treat run count as DAU.
- **Average Run Duration:** average `durationSeconds` on `run_finished`. Runs abandoned when the app closes are intentionally excluded from this event and are represented by `run_abandoned`.
- **Portal Engagement:** sessions with `portal_entered` / sessions with `run_started`.
- **Boss Attempt Rate:** sessions with `boss_started` / sessions with `run_started`.
- **Boss Completion Rate:** `boss_defeated` / `boss_started`, filtered/grouped by `bossId` (never combine bosses). Include attempts spanning sessions when evaluating the full beta window.
- **Secret World Discovery Rate:** anonymous players with `secret_world_discovered` / anonymous players with `run_started`.
- **Skin Preview Rate:** sessions with `skin_previewed` / sessions with `shop_opened`.
- **Pet Unlock Rate:** players with `pet_unlocked` / players with `run_started`.

The funnel is `app_started → main_menu_viewed → run_started → first_portal_entered → boss_started → boss_defeated → run_finished → later run_started`. `first_portal_entered` is emitted at most once per run. Run totals are summarized at completion; individual coin collections are never sent. Analytics is opt-in and unavailable in DEV unless a deliberate, separately reviewed development override is introduced. Metrics are intentionally coarse and use the operator-configured PostHog project; the development checkout currently lacks production keys.