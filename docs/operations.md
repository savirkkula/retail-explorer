# Operations

## Run

The app needs the Fabric host for data (see [architecture.md](architecture.md)), and Rayfin auth settings from a deployment.

```bash
az login                      # tenant 3ce6b0b4-da74-41c3-8955-a44959b72ad7
npx rayfin login --encryption-fallback-enabled --tenant 3ce6b0b4-da74-41c3-8955-a44959b72ad7
npx rayfin up --encryption-fallback-enabled --tenant 3ce6b0b4-da74-41c3-8955-a44959b72ad7 \
  --workspace-uri "https://app.fabric.microsoft.com/groups/b0b2b41a-8a40-4537-ae6f-543bc4022b2b" --yes
npx rayfin up status
npm run dev                   # then open the app item in Fabric and append &devUri=http://localhost:5173
```

- `npm run dev` fails with "Missing required env vars for Fabric auth" until a deployment exists (`rayfin up` writes `rayfin/.deployments.json`; `rayfin env` turns it into `VITE_*` variables).
- `--encryption-fallback-enabled` is required on machines without an OS keychain; it stores the Rayfin token as plaintext under `~/.rayfin`.
- `rayfin login` opens a browser and redirects to a random `http://localhost:<port>`. On a remote or headless machine the browser must reach that port (forward it), or run the login from a machine with a browser.
- The Fabric capacity must be running. It was paused once during development; resume it in the Azure portal or Fabric admin portal before querying or deploying.
- `npx rayfin up` also applies pending schema changes for the app-owned tables (the data service is enabled). `npx rayfin up db apply` applies the schema alone. Check the result with `npx rayfin up status`, which lists the app SQL database.

## Test and check

```bash
npm test                 # vitest
npm run lint
npx tsc --noEmit -p tsconfig.json
npm run build:fabric     # generate config, type-check, vite build
npm run validate:visual -- src/queries/store/unit-trend.ts '{"range":{"start":"2025-10-01","end":"2026-09-30"},"unitKey":50}'
```

Specs sit next to their sources: periods, geometry, insights, actions, color scales, mall model, table rows, selection reducer, scene layout, query factories and the app shell.

The Rayfin entities compile the way the CLI compiles them: `npx tsc --build rayfin/tsconfig.json --force` (output goes to `rayfin/.temp/`, git-ignored).

Known failures that are not from this work:

- `scripts/validate-visual.spec.mjs` has one test that spies on an ESM export and fails.
- `eslint` reports one `react-hooks/set-state-in-effect` error in the template file `src/hooks/use-semantic-model-query.ts`.

## Resources

| Resource | Id |
|---|---|
| Workspace `ws_data_app_demo` | `b0b2b41a-8a40-4537-ae6f-543bc4022b2b` |
| Lakehouse `lh_retail_explorer` | `d7c7e41f-510e-42d7-865f-142d6e01f9b9` |
| Lakehouse SQL endpoint | `eb9842cf-8a51-4b28-998f-16a8e2a62f2d` |
| Semantic model `sm_retail_explorer` | `2c27206d-0145-4f8b-97d2-103567e58684` (changes if recreated; `fabric.yaml` is the source of truth) |
| App item `da_retail_explorer` | `1ab218ad-9945-42a1-94ec-a38248ca9626` |
| App SQL database `da_retail_explorer` (actions) | `3b1f147a-2581-419f-a20e-f919509409d0` |
| Hosted app | `https://quiet-arch-a3d9af2659-westeurope.webapp.fabricapps.net` |

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Forbidden on the workspace | Azure CLI is signed into another tenant. `az account set --subscription "Naks Pay As You Go Azure Subscription"` and re-check |
| Model refresh fails with "source tables do not exist or access denied" | Direct Lake on OneLake issue, or SQL endpoint not synced. Use the SQL endpoint expression and run `refreshMetadata` on the endpoint before refreshing |
| Model update fails with `ThrowObjectNotFoundError` | Relationships were removed. Delete and recreate the model (`deploy_model.py --recreate`) and re-register the connection |
| Model update fails with a measure/column name clash | A measure shares its name with a column in the same table. Rename the column (`RENAMED` in `build_model.py`) |
| `Failed to fetch` / queries never return in a plain browser tab | The app only gets data through the Fabric host iframe; open it from Fabric |
| Query error on `Property[...]` | `Property` is a DAX keyword. Write `'Property'[...]` |
| Blank scene, no error | WebGL unavailable; the 2D plan fallback should appear. In headless Chrome use `--use-angle=swiftshader --enable-unsafe-swiftshader` |
| `removeChild` page error when switching views | A drei `Html` was unmounted. Keep labels mounted and hide them with CSS |
| CLI `query` returns at most 1000 rows | CLI limit; the app queries return at most 457 rows each |
| "Actions are unavailable" in the store panel or queue | The Rayfin data API call failed. Check that `VITE_RAYFIN_API_URL` and `VITE_RAYFIN_PUBLISHABLE_KEY` are set (`rayfin env`), that the app is deployed with `services.data` enabled, and run `npx rayfin up db apply` if the tables are missing. The rest of the app keeps working |
| "Sign in to save changes." when creating an action | The session is not authenticated. Sign in through the auth gate; writes need a Rayfin session |
| Internal server error from the data API after deploy | A text field without `max`. Every `@text()` needs `{ max: N }` |

## Known gaps and ideas

Not built: month-by-month play animation, an energy/ESG floor lens (the data exists), deep-link URLs for shared views, tenant-level cross-center views.

Not built in the action center: notifications (email or Teams) when an action is assigned, approvals, deleting or reopening-with-history of actions, author-only edit rules (every signed-in user can edit every action), and user display names (only emails are available). The action flow was verified by type-check, lint, unit tests and a deploy, not by clicking through the deployed app.

Assumptions to revisit with real data: Citycenter retail area and floor split, per-center sales and visitor shares, the XXL opening date, lease and rent levels, and the health-score weights.

## Verification approach used

The UI was verified end to end in headless Chrome against the real model. A throwaway harness emulated the Fabric host: it served the app in an iframe, answered the `semanticModel.executeDax` postMessage requests by running the DAX through the Power BI `executeQueries` API, and returned the result as Arrow. It is not part of the repository.
