/* ============================================================================
   Front-end configuration & feature flags.

   By default the tracker runs on the embedded sample dataset (data.js) so the
   site works offline with zero setup — ideal for a portfolio demo.

   Flip a flag to `true` to pull LIVE data from Airtable and/or Jira instead.
   When a live source is enabled, the tracker calls the matching client in
   integrations/ and falls back to the sample data if the request fails
   (e.g. missing keys), so the demo never breaks.

   ⚠️  SECURITY NOTE
   API keys in front-end code are visible to anyone who views the page. For a
   real deployment, do NOT paste tokens here — proxy the requests through a
   small backend (see python/integrations/) or a serverless function, and let
   this file point at THAT endpoint. The fields below exist so the wiring is
   demonstrable end-to-end; keep the flags OFF for a public portfolio.
   ============================================================================ */

window.TRACKER_CONFIG = {
  // --- master switches -------------------------------------------------
  integrations: {
    airtable: {
      enabled: false,                       // ← set true to use live Airtable
      // Prefer a proxy URL over raw keys in the browser:
      proxyUrl: "",                         // e.g. "/api/airtable" (recommended)
      // Direct-mode fields (dev/demo only — never ship a real key here):
      baseId:  "appXXXXXXXXXXXXXX",
      table:   "Deliverables",
      apiKey:  "",                          // Personal Access Token (leave blank in prod)
    },
    jira: {
      enabled: false,                       // ← set true to use live Jira
      proxyUrl: "",                         // e.g. "/api/jira" (recommended)
      // Direct-mode fields (dev/demo only):
      host:    "your-domain.atlassian.net",
      jql:     'project in (NWR, MHP, FLEET, VFO) ORDER BY updated DESC',
      email:   "",
      apiToken:"",
    },
  },

  // How to merge when BOTH live sources are on:
  //  "airtable"  → Airtable is the source of truth
  //  "jira"      → Jira is the source of truth
  //  "merge"     → Airtable rows, enriched with Jira status by issue key
  primarySource: "airtable",

  // Reference "today" for overdue/on-time math (kept in sync with data.js).
  today: "2026-07-22",
};
