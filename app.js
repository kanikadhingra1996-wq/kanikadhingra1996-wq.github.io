/* ============================================================================
   Project Tracker — view logic (grid / board / dashboard), filters, modal.
   Data comes from resolveDataSource(): live Airtable/Jira when enabled in
   config.js, otherwise the embedded sample dataset (data.js).
   ============================================================================ */

(function () {
  "use strict";

  const { STATUSES, PRIORITY, CLIENTS } = window.TRACKER;
  const CFG = window.TRACKER_CONFIG || { integrations: {}, today: window.TRACKER.TODAY };
  const TODAY = new Date(CFG.today || window.TRACKER.TODAY);

  // status → css class fragment (strip spaces)
  const stClass = (s) => "st-" + s.replace(/\s+/g, "");
  const clientColor = (c) => (CLIENTS[c] && CLIENTS[c].color) || "#6366f1";

  // App state
  const state = {
    all: [],
    source: "sample",          // "sample" | "airtable" | "jira" | "merge" | "error"
    view: "grid",
    sort: { key: "due", dir: 1 },
    filters: { client: "", status: "", priority: "", search: "" },
  };

  /* ---------------------------------------------------------------------
     DATA SOURCE — honours config flags, always falls back to sample data
     --------------------------------------------------------------------- */
  async function resolveDataSource() {
    const ints = CFG.integrations || {};
    const wantAir = ints.airtable && ints.airtable.enabled && window.AirtableClient;
    const wantJira = ints.jira && ints.jira.enabled && window.JiraClient;

    if (!wantAir && !wantJira) {
      return { source: "sample", data: window.TRACKER.DELIVERABLES };
    }

    try {
      let air = null, jira = null;
      if (wantAir)  air  = await window.AirtableClient.fetchDeliverables(ints.airtable);
      if (wantJira) jira = await window.JiraClient.fetchDeliverables(ints.jira);

      if (air && jira) {
        if (CFG.primarySource === "jira") return { source: "jira", data: jira };
        if (CFG.primarySource === "merge") return { source: "merge", data: mergeByJiraKey(air, jira) };
        return { source: "airtable", data: air };
      }
      if (air)  return { source: "airtable", data: air };
      if (jira) return { source: "jira", data: jira };
      throw new Error("no records");
    } catch (err) {
      console.warn("[tracker] live integration failed, using sample data:", err);
      return { source: "error", data: window.TRACKER.DELIVERABLES };
    }
  }

  // Airtable rows enriched with live Jira status, matched on issue key.
  function mergeByJiraKey(air, jira) {
    const byKey = Object.fromEntries(jira.map((j) => [j.jira, j]));
    return air.map((row) => {
      const j = byKey[row.jira];
      return j ? { ...row, status: j.status, progress: j.progress } : row;
    });
  }

  /* ---------------------------------------------------------------------
     FILTERING
     --------------------------------------------------------------------- */
  function filtered() {
    const f = state.filters;
    const q = f.search.trim().toLowerCase();
    return state.all.filter((d) => {
      if (f.client && d.client !== f.client) return false;
      if (f.status && d.status !== f.status) return false;
      if (f.priority && d.priority !== f.priority) return false;
      if (q) {
        const hay = `${d.title} ${d.id} ${d.jira} ${d.project} ${d.type} ${(d.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sorted(rows) {
    const { key, dir } = state.sort;
    return [...rows].sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === "priority") { av = PRIORITY.indexOf(av); bv = PRIORITY.indexOf(bv); }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  /* ---------------------------------------------------------------------
     HELPERS
     --------------------------------------------------------------------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDate = (s) => s ? new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
  const isOverdue = (d) => d.status !== "Done" && d.due && new Date(d.due) < TODAY;

  function clientChip(c) {
    return `<span class="client-chip"><span class="client-dot" style="background:${clientColor(c)}"></span>${esc(c)}</span>`;
  }

  /* ---------------------------------------------------------------------
     VIEW: GRID (Airtable-style)
     --------------------------------------------------------------------- */
  const COLS = [
    { key: "id", label: "ID" },
    { key: "title", label: "Deliverable" },
    { key: "client", label: "Client" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "due", label: "Due" },
    { key: "progress", label: "Progress" },
  ];

  function renderGrid(rows) {
    const head = COLS.map((c) => {
      const arrow = state.sort.key === c.key ? `<span class="arrow">${state.sort.dir === 1 ? "▲" : "▼"}</span>` : "";
      return `<th data-sort="${c.key}">${c.label}${arrow}</th>`;
    }).join("");

    const body = rows.map((d) => `
      <tr data-id="${d.id}">
        <td class="cell-id">${esc(d.id)}</td>
        <td class="cell-title">${esc(d.title)}<br><span class="cell-id">${esc(d.jira)} · ${esc(d.project)}</span></td>
        <td>${clientChip(d.client)}</td>
        <td>${esc(d.type)}</td>
        <td><span class="pill ${stClass(d.status)}">${esc(d.status)}</span></td>
        <td><span class="prio prio-${d.priority}">${esc(d.priority)}</span></td>
        <td class="${isOverdue(d) ? "due-over" : ""}">${fmtDate(d.due)}${isOverdue(d) ? " ⚠" : ""}</td>
        <td>
          <div class="progress-mini">
            <span class="progress-track"><span class="progress-fill" style="width:${d.progress}%"></span></span>
            <span>${d.progress}%</span>
          </div>
        </td>
      </tr>`).join("");

    return `<div class="grid-scroll"><table class="grid-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${body || `<tr><td colspan="8" class="board-empty">No deliverables match your filters.</td></tr>`}</tbody>
    </table></div>`;
  }

  /* ---------------------------------------------------------------------
     VIEW: BOARD (Jira-style)
     --------------------------------------------------------------------- */
  function renderBoard(rows) {
    const cols = STATUSES.map((st) => {
      const items = rows.filter((d) => d.status === st);
      const cards = items.map((d) => `
        <div class="kcard" data-id="${d.id}" style="--c:${clientColor(d.client)}">
          <div class="kcard-top">
            <span class="kcard-jira">${esc(d.jira)}</span>
            <span class="prio prio-${d.priority}">${esc(d.priority)}</span>
          </div>
          <div class="kcard-title">${esc(d.title)}</div>
          <div class="kcard-meta">
            <span class="kcard-client"><span class="client-dot" style="background:${clientColor(d.client)}"></span>${esc(d.client)}</span>
          </div>
          <div class="kcard-foot">
            <span class="${isOverdue(d) ? "due-over" : "kcard-meta"}">Due ${fmtDate(d.due)}${isOverdue(d) ? " ⚠" : ""}</span>
            <span class="kcard-points">${d.points} pt</span>
          </div>
        </div>`).join("");
      return `<div class="board-col">
        <div class="board-col-head"><h4>${st}</h4><span class="board-count">${items.length}</span></div>
        <div class="board-cards">${cards || `<div class="board-empty">—</div>`}</div>
      </div>`;
    }).join("");
    return `<div class="board">${cols}</div>`;
  }

  /* ---------------------------------------------------------------------
     VIEW: DASHBOARD (KPIs + charts)
     --------------------------------------------------------------------- */
  function renderDashboard(rows) {
    const total = rows.length;
    const done = rows.filter((d) => d.status === "Done").length;
    const overdue = rows.filter(isOverdue).length;
    const blocked = rows.filter((d) => d.status === "Blocked").length;
    const wip = rows.filter((d) => d.status === "In Progress" || d.status === "In Review").length;
    const onTime = done ? Math.round((rows.filter((d) => d.status === "Done" && !isOverdue(d)).length / done) * 100) : 0;
    const totalPts = rows.reduce((s, d) => s + d.points, 0);

    const kpis = [
      { label: "Deliverables", value: total, sub: `${totalPts} story points`, cls: "" },
      { label: "On-time completion", value: onTime + "%", sub: `${done} completed`, cls: "good" },
      { label: "In progress", value: wip, sub: "active this sprint", cls: "" },
      { label: "Overdue / blocked", value: overdue + blocked, sub: `${blocked} blocked · ${overdue} overdue`, cls: (overdue + blocked) ? "bad" : "good" },
    ].map((k) => `<div class="kpi">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-sub ${k.cls}">${k.sub}</div>
      </div>`).join("");

    // Bar chart: workload by client (story points)
    const byClient = {};
    rows.forEach((d) => { byClient[d.client] = (byClient[d.client] || 0) + d.points; });
    const maxPts = Math.max(1, ...Object.values(byClient));
    const bars = Object.entries(byClient).sort((a, b) => b[1] - a[1]).map(([c, pts]) => `
      <div class="bar-row">
        <span class="bar-label">${esc(c)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(pts / maxPts) * 100}%;background:${clientColor(c)}"></span></span>
        <span class="bar-val">${pts}</span>
      </div>`).join("") || `<div class="board-empty">No data.</div>`;

    // Donut: status distribution
    const statusColors = { "Backlog": "#8b8994", "In Progress": "#0ea5e9", "In Review": "#6366f1", "Blocked": "#dc2626", "Done": "#16a34a" };
    const counts = STATUSES.map((st) => ({ st, n: rows.filter((d) => d.status === st).length })).filter((x) => x.n > 0);
    const donut = buildDonut(counts, statusColors, total);

    return `<div class="dash">
      <div class="kpi-row">${kpis}</div>
      <div class="dash-charts">
        <div class="chart-card">
          <h4>Workload by client — story points</h4>
          ${bars}
        </div>
        <div class="chart-card">
          <h4>Status distribution</h4>
          <div class="donut-wrap">
            ${donut.svg}
            <ul class="donut-legend">${donut.legend}</ul>
          </div>
        </div>
      </div>
    </div>`;
  }

  function buildDonut(counts, colors, total) {
    if (!total) return { svg: `<div class="board-empty">No data.</div>`, legend: "" };
    const R = 62, C = 2 * Math.PI * R, cx = 80, cy = 80, sw = 26;
    let offset = 0;
    const segs = counts.map(({ st, n }) => {
      const frac = n / total;
      const dash = frac * C;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${colors[st]}"
        stroke-width="${sw}" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})" />`;
      offset += dash;
      return seg;
    }).join("");
    const svg = `<svg class="donut" width="160" height="160" viewBox="0 0 160 160">
      ${segs}
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="26" font-weight="700" fill="currentColor" font-family="Fraunces, serif">${total}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="10" fill="#8b8994">total</text>
    </svg>`;
    const legend = counts.map(({ st, n }) =>
      `<li><span class="legend-dot" style="background:${colors[st]}"></span>${st}<span class="legend-val">${n}</span></li>`).join("");
    return { svg, legend };
  }

  /* ---------------------------------------------------------------------
     RENDER ORCHESTRATION
     --------------------------------------------------------------------- */
  function render() {
    const rows = filtered();
    const gridPanel = document.getElementById("view-grid");
    const boardPanel = document.getElementById("view-board");
    const dashPanel = document.getElementById("view-dashboard");

    gridPanel.hidden = state.view !== "grid";
    boardPanel.hidden = state.view !== "board";
    dashPanel.hidden = state.view !== "dashboard";

    if (state.view === "grid") gridPanel.innerHTML = renderGrid(sorted(rows));
    if (state.view === "board") boardPanel.innerHTML = renderBoard(rows);
    if (state.view === "dashboard") dashPanel.innerHTML = renderDashboard(rows);

    // result count + data-source badge
    const badge = {
      sample: `<span class="data-source-badge sample">Sample data</span>`,
      airtable: `<span class="data-source-badge live">● Live · Airtable</span>`,
      jira: `<span class="data-source-badge live">● Live · Jira</span>`,
      merge: `<span class="data-source-badge live">● Live · Airtable + Jira</span>`,
      error: `<span class="data-source-badge error">Live source unavailable — showing sample data</span>`,
    }[state.source];
    document.getElementById("result-count").innerHTML =
      `Showing <strong>${rows.length}</strong> of ${state.all.length} deliverables ${badge}`;
  }

  /* ---------------------------------------------------------------------
     MODAL
     --------------------------------------------------------------------- */
  function openModal(id) {
    const d = state.all.find((x) => x.id === id);
    if (!d) return;
    document.getElementById("modal-body").innerHTML = `
      <div class="m-jira">${esc(d.jira)} · ${esc(d.id)}</div>
      <h3 class="m-title">${esc(d.title)}</h3>
      <div class="m-grid">
        <div class="m-field"><label>Client</label><div class="v">${clientChip(d.client)}</div></div>
        <div class="m-field"><label>Project</label><div class="v">${esc(d.project)}</div></div>
        <div class="m-field"><label>Type</label><div class="v">${esc(d.type)}</div></div>
        <div class="m-field"><label>Owner</label><div class="v">${esc(d.owner)}</div></div>
        <div class="m-field"><label>Status</label><div class="v"><span class="pill ${stClass(d.status)}">${esc(d.status)}</span></div></div>
        <div class="m-field"><label>Priority</label><div class="v"><span class="prio prio-${d.priority}">${esc(d.priority)}</span></div></div>
        <div class="m-field"><label>Start</label><div class="v">${fmtDate(d.start)}</div></div>
        <div class="m-field"><label>Due</label><div class="v ${isOverdue(d) ? "due-over" : ""}">${fmtDate(d.due)}${isOverdue(d) ? " ⚠ overdue" : ""}</div></div>
        <div class="m-field"><label>Sprint</label><div class="v">${esc(d.sprint || "—")}</div></div>
        <div class="m-field"><label>Story points</label><div class="v">${d.points}</div></div>
      </div>
      <div class="m-field"><label>Progress — ${d.progress}%</label>
        <div class="m-progress-track"><span class="m-progress-fill" style="width:${d.progress}%"></span></div>
      </div>
      <div class="m-field" style="margin-top:16px"><label>Tags</label>
        <div class="m-tags">${(d.tags || []).map((t) => `<span class="m-tag">${esc(t)}</span>`).join("") || "—"}</div>
      </div>`;
    document.getElementById("modal").hidden = false;
  }
  function closeModal() { document.getElementById("modal").hidden = true; }

  /* ---------------------------------------------------------------------
     WIRING
     --------------------------------------------------------------------- */
  function populateFilters() {
    const setOpts = (sel, vals) => {
      vals.forEach((v) => { const o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
    };
    setOpts(document.getElementById("filter-client"), Object.keys(CLIENTS));
    setOpts(document.getElementById("filter-status"), STATUSES);
    setOpts(document.getElementById("filter-priority"), PRIORITY);
  }

  function bindEvents() {
    // view switch
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.view = btn.dataset.view;
        render();
      });
    });
    // filters
    const bind = (id, key) => document.getElementById(id).addEventListener("input", (e) => { state.filters[key] = e.target.value; render(); });
    bind("filter-client", "client");
    bind("filter-status", "status");
    bind("filter-priority", "priority");
    bind("filter-search", "search");
    document.getElementById("filter-reset").addEventListener("click", () => {
      state.filters = { client: "", status: "", priority: "", search: "" };
      ["filter-client", "filter-status", "filter-priority", "filter-search"].forEach((id) => (document.getElementById(id).value = ""));
      render();
    });
    // delegated clicks: sort headers + row/card → modal
    document.getElementById("tracker-app").addEventListener("click", (e) => {
      const th = e.target.closest("th[data-sort]");
      if (th) {
        const k = th.dataset.sort;
        if (state.sort.key === k) state.sort.dir *= -1; else state.sort = { key: k, dir: 1 };
        render();
        return;
      }
      const item = e.target.closest("[data-id]");
      if (item) openModal(item.dataset.id);
    });
    // modal close
    document.getElementById("modal").addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    // hero count-up
    animateStats();
  }

  function animateStats() {
    document.querySelectorAll(".hero-stats strong[data-count]").forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.textContent.replace(/[0-9]/g, "");
      let cur = 0;
      const step = Math.max(1, Math.round(target / 28));
      const tick = () => {
        cur = Math.min(target, cur + step);
        el.textContent = cur + suffix;
        if (cur < target) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------------------------------------------------------------------
     INIT
     --------------------------------------------------------------------- */
  async function init() {
    populateFilters();
    bindEvents();
    render(); // paint immediately with whatever's loaded (empty → sample after resolve)

    const { source, data } = await resolveDataSource();
    state.source = source;
    state.all = data;
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
