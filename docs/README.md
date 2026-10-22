# Retail Explorer

A Fabric data app demo (`da_retail_explorer`). It visualises three shopping centers (Forum, Citycenter, Ratina) as exploded 3D floor stacks. Stores are colored by retail KPIs ("lenses") that matter to a shopping-center landlord, and each store opens a profile.

All figures are **synthetic demo data**. Only the following come from public sources: the three center names, published floor counts and areas for Forum and Ratina, the 2025 portfolio totals (36.2M visitors, EUR 617.3M sales), and the names of three real tenants (XXL, Elixia, Beyond Retro). The UI shows a "Demo data" badge.

Beyond reporting, the app is also an action center: store flags can be turned into tracked follow-ups (lease renewal, rent review, marketing a vacant unit, performance review) that are saved in a SQL database through Rayfin and shown on the map. Actions are real user data, not demo data.

## Documents

| Document | Contents |
|---|---|
| [architecture.md](architecture.md) | End-to-end data flow, architecture diagram, repository layout, app architecture, 3D scene design, app-owned action data |
| [data-and-model.md](data-and-model.md) | Synthetic data generator, Lakehouse tables, semantic model, measures, rebuild and redeploy steps, action tables |
| [app-guide.md](app-guide.md) | What the user sees, lenses and KPI definitions, action center, queries, state, design system |
| [operations.md](operations.md) | Run, test, deploy, resource IDs, troubleshooting, known gaps |

## At a glance

```
data-gen (Python)  ->  Fabric Lakehouse (Delta)  ->  Direct Lake semantic model  ->  DAX  ->  React app (Fabric iframe)
                                                                                          |
                                       Rayfin data API (GraphQL)  <->  SQL database  <-----+   actions and comments
```

- Workspace: `ws_data_app_demo` (`b0b2b41a-8a40-4537-ae6f-543bc4022b2b`), tenant `3ce6b0b4-da74-41c3-8955-a44959b72ad7`
- Lakehouse: `lh_retail_explorer`
- Semantic model: `sm_retail_explorer`, connection alias `retailExplorer` in `fabric.yaml`
- App item: `da_retail_explorer`
- App database: SQL database `da_retail_explorer`, managed by Rayfin (`mssql`)
- Stack: React 19, Vite, Tailwind v4, `@react-three/fiber` + `three` (3D), Vega-Lite and DataGrid from `@microsoft/fabric-visuals` / `fabric-datagrid`
