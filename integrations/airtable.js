/* ============================================================================
   Airtable integration client (browser).
   Activated only when TRACKER_CONFIG.integrations.airtable.enabled === true.

   Returns records normalized to the tracker's deliverable shape:
     { id, jira, title, client, project, type, status, priority, owner,
       start, due, progress, points, sprint, tags }

   Two modes:
     • proxyUrl set  → GET {proxyUrl}?table=...   (recommended; keeps keys server-side)
     • direct        → GET https://api.airtable.com/v0/{baseId}/{table}
   ============================================================================ */

(function () {
  const AirtableClient = {
    /** @returns {Promise<Array>} normalized deliverables */
    async fetchDeliverables(cfg) {
      const records = cfg.proxyUrl
        ? await this._viaProxy(cfg)
        : await this._direct(cfg);
      return records.map(this._normalize);
    },

    async _viaProxy(cfg) {
      const url = `${cfg.proxyUrl}?table=${encodeURIComponent(cfg.table)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Airtable proxy ${res.status}`);
      const data = await res.json();
      return data.records || data; // proxy may unwrap or pass through
    },

    async _direct(cfg) {
      if (!cfg.apiKey) throw new Error("Airtable apiKey missing (use a proxy in production)");
      let records = [], offset;
      do {
        const url = new URL(`https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(cfg.table)}`);
        url.searchParams.set("pageSize", "100");
        if (offset) url.searchParams.set("offset", offset);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.apiKey}` } });
        if (!res.ok) throw new Error(`Airtable API ${res.status}`);
        const data = await res.json();
        records = records.concat(data.records);
        offset = data.offset;
      } while (offset);
      return records;
    },

    /** Map an Airtable record → tracker deliverable. Field names match the
        columns in data/deliverables.csv so a base built from that CSV works as-is. */
    _normalize(rec) {
      const f = rec.fields || {};
      const tags = f.tags
        ? (Array.isArray(f.tags) ? f.tags : String(f.tags).split(/[;,]\s*/))
        : [];
      return {
        id:       f.id || rec.id,
        jira:     f.jira || "",
        title:    f.title || "(untitled)",
        client:   f.client || "Unassigned",
        project:  f.project || "",
        type:     f.type || "",
        status:   f.status || "Backlog",
        priority: f.priority || "Medium",
        owner:    f.owner || "",
        start:    f.start || "",
        due:      f.due || "",
        progress: Number(f.progress) || 0,
        points:   Number(f.points) || 0,
        sprint:   f.sprint || "",
        tags,
      };
    },
  };

  window.AirtableClient = AirtableClient;
})();
