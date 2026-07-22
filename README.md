# Kanika Dhingra — Business Analyst Portfolio

A single-page portfolio built around an interactive **Professional Project
Tracker**. It showcases the day-to-day of a BA: managing client deliverables,
deadlines, and statuses across an Airtable-style grid, a Jira-style board, and a
KPI dashboard — all backed by a runnable Python analytics layer.

> The site ships with realistic **sample data** so it works instantly with no
> setup. Optional feature flags switch the tracker over to **live Airtable / Jira**.

## Run the site

No build step. Either:

```bash
open index.html                 # macOS — just double-click works too
# or serve it (nicer for relative paths):
python3 -m http.server 8000     # then visit http://localhost:8000
```

### Views
- **Grid** — Airtable-style table. Click any column header to sort; click a row for details.
- **Board** — Jira-style Kanban across Backlog → In Progress → In Review → Blocked → Done.
- **Dashboard** — KPIs, workload-by-client bars, and a status-distribution donut.

Filters (client / status / priority / search) apply to all three views at once.

## Run the Python analytics

```bash
python3 -m pip install -r requirements.txt   # pandas (requests only for live mode)
python3 python/project_analytics.py
```

Prints a delivery-health report and writes `data/status_counts.json` +
`data/metrics.json`. By default it reads `data/deliverables.csv` — the exact
dataset the website uses.

## Live integrations (optional, flag-driven)

Everything runs on sample data until you flip a flag. Nothing breaks if creds
are missing — both layers fall back to the sample data.

**Website** — edit `config.js`:
```js
integrations: {
  airtable: { enabled: true, proxyUrl: "/api/airtable", table: "Deliverables" },
  jira:     { enabled: true, proxyUrl: "/api/jira", jql: "project = NWR" },
}
```

**Python** — copy `.env.example` → `.env` and set:
```bash
USE_AIRTABLE=1
AIRTABLE_API_KEY=pat_...
AIRTABLE_BASE_ID=app...
```

> ⚠️ **Security:** never put real API keys in `config.js` (it's public in the
> browser). Point `proxyUrl` at a small backend or serverless function that
> holds the token server-side. The Python clients in `python/integrations/`
> read keys from environment variables and can serve as that proxy.

## Structure

```
kanika-ba-portfolio/
├── index.html              # page
├── styles.css              # design system (light/dark aware)
├── config.js               # feature flags for live integrations (default OFF)
├── data.js                 # embedded sample dataset (site)
├── app.js                  # tracker views, filters, dashboard, modal
├── integrations/
│   ├── airtable.js         # browser Airtable client (flag-gated)
│   └── jira.js             # browser Jira client (flag-gated)
├── data/
│   └── deliverables.csv    # same dataset for Python
├── python/
│   ├── config.py           # env-driven flags & config
│   ├── project_analytics.py# runnable delivery-health report
│   └── integrations/
│       ├── airtable_client.py
│       └── jira_client.py
├── requirements.txt
└── .env.example
```

## Before publishing
- Replace the email / LinkedIn / résumé links in the Contact section of `index.html`.
- Swap the sample deliverables in `data.js` (and `data/deliverables.csv`) for real ones, or connect a live source.

---
*Sample client names and metrics are illustrative.*
