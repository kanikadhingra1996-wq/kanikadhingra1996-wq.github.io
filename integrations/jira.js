/* ============================================================================
   Jira integration client (browser).
   Activated only when TRACKER_CONFIG.integrations.jira.enabled === true.

   Maps Jira issues → the tracker's deliverable shape and translates Jira
   status categories into the board's five columns.

   Two modes:
     • proxyUrl set  → GET {proxyUrl}?jql=...     (recommended; keeps token server-side)
     • direct        → POST https://{host}/rest/api/3/search   (Basic auth)

   NOTE: Jira Cloud does not send CORS headers for browser calls, so the
   DIRECT mode only works from a same-origin context or a CORS-enabled proxy.
   In production always use `proxyUrl`. Direct mode is here to document the
   exact request shape.
   ============================================================================ */

(function () {
  // Jira status category → tracker column
  const STATUS_MAP = {
    "To Do": "Backlog",
    "Backlog": "Backlog",
    "In Progress": "In Progress",
    "In Review": "In Review",
    "Review": "In Review",
    "Blocked": "Blocked",
    "Done": "Done",
  };

  const PRIORITY_MAP = {
    "Highest": "Critical", "Critical": "Critical",
    "High": "High", "Medium": "Medium", "Low": "Low", "Lowest": "Low",
  };

  const JiraClient = {
    async fetchDeliverables(cfg) {
      const issues = cfg.proxyUrl
        ? await this._viaProxy(cfg)
        : await this._direct(cfg);
      return issues.map((i) => this._normalize(i, cfg));
    },

    async _viaProxy(cfg) {
      const url = `${cfg.proxyUrl}?jql=${encodeURIComponent(cfg.jql)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Jira proxy ${res.status}`);
      const data = await res.json();
      return data.issues || data;
    },

    async _direct(cfg) {
      if (!cfg.apiToken || !cfg.email) throw new Error("Jira email/apiToken missing (use a proxy in production)");
      const res = await fetch(`https://${cfg.host}/rest/api/3/search`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${cfg.email}:${cfg.apiToken}`),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          jql: cfg.jql,
          maxResults: 100,
          fields: ["summary", "status", "priority", "assignee", "duedate",
                   "customfield_10016", "labels", "project", "created"],
        }),
      });
      if (!res.ok) throw new Error(`Jira API ${res.status}`);
      const data = await res.json();
      return data.issues;
    },

    _normalize(issue, cfg) {
      const f = issue.fields || {};
      const rawStatus = f.status?.name || "To Do";
      const rawPrio = f.priority?.name || "Medium";
      return {
        id:       issue.key,
        jira:     issue.key,
        title:    f.summary || "(untitled)",
        client:   f.project?.name || "Unassigned",
        project:  f.project?.name || "",
        type:     (f.issuetype && f.issuetype.name) || "Task",
        status:   STATUS_MAP[rawStatus] || "Backlog",
        priority: PRIORITY_MAP[rawPrio] || "Medium",
        owner:    f.assignee?.displayName || "Unassigned",
        start:    (f.created || "").slice(0, 10),
        due:      f.duedate || "",
        progress: rawStatus === "Done" ? 100 : 0,
        points:   Number(f.customfield_10016) || 0,   // default "Story Points" field
        sprint:   "",
        tags:     f.labels || [],
      };
    },
  };

  window.JiraClient = JiraClient;
})();
