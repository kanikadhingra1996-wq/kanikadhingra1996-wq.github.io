/* ============================================================================
   Interactive BI widget — metric + chart-type selectors driving an SVG chart,
   KPI tiles, and a plain-language insight. Vanilla JS, no chart library.
   Mimics the interactivity of a Power BI / Tableau report page.

   Metrics blend business-analyst delivery (requirements throughput) with the
   campaign performance metrics Kanika reports on (conversion, ROAS, abandonment).
   ============================================================================ */

(function () {
  "use strict";

  const SPRINTS = ["S9", "S10", "S11", "S12", "S13", "S14", "S15", "S16", "S17", "S18"];
  const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  // Each metric: label set, series, unit, direction, and a computed insight.
  const METRICS = {
    requirements: {
      label: "Requirements delivered",
      title: "Requirements delivered — committed vs. completed",
      sub: "User stories / specs per sprint",
      unit: "",
      labels: SPRINTS,
      series: [
        { name: "Committed", color: "#a5b4fc", values: [8, 9, 10, 11, 10, 12, 11, 13, 12, 14] },
        { name: "Completed", color: "#4f46e5", values: [7, 9, 9, 10, 11, 10, 12, 12, 13, 14] },
      ],
      insight: "Requirement throughput tracks commitment closely — a 95%+ say/do ratio over recent sprints shows a predictable, well-refined backlog.",
    },
    conversion: {
      label: "Conversion rate",
      title: "Checkout conversion rate",
      sub: "% of sessions that complete a purchase",
      unit: "%",
      labels: MONTHS,
      series: [{ name: "Conversion", color: "#0ea5e9", values: [1.9, 2.1, 2.2, 2.5, 2.7, 2.8, 3.0, 3.2, 3.3, 3.6] }],
      insight: "Conversion climbed from 1.9% to 3.6% as checkout requirements and funnel fixes shipped — an 89% relative lift.",
    },
    roas: {
      label: "Return on ad spend",
      title: "Return on ad spend (ROAS)",
      sub: "Revenue per $1 of ad spend",
      unit: "x",
      labels: MONTHS,
      series: [{ name: "ROAS", color: "#16a34a", values: [2.1, 2.4, 2.6, 2.9, 3.1, 3.4, 3.6, 4.0, 4.3, 4.7] }],
      insight: "ROAS more than doubled (2.1x → 4.7x) after the attribution model let us shift spend toward the highest-return channels.",
    },
    abandonment: {
      label: "Cart abandonment",
      title: "Cart abandonment rate",
      sub: "% of carts not converted",
      unit: "%",
      lowerBetter: true,
      labels: MONTHS,
      series: [{ name: "Abandonment", color: "#d97706", values: [72, 70, 69, 66, 64, 62, 59, 57, 55, 52] }],
      insight: "Cart abandonment fell from 72% to 52% following the payment-flow and UX requirements work.",
    },
  };

  const state = { metric: "requirements", type: "bar" };

  /* ---------- controls ---------- */
  function buildControls() {
    const wrap = document.getElementById("bi-metrics");
    wrap.innerHTML = Object.entries(METRICS).map(([key, m], i) =>
      `<button class="bi-metric-btn ${i === 0 ? "is-active" : ""}" data-metric="${key}" role="tab">${m.label}</button>`
    ).join("");

    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-metric]");
      if (!btn) return;
      state.metric = btn.dataset.metric;
      wrap.querySelectorAll(".bi-metric-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      render();
    });

    document.getElementById("bi-chart-toggle").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-type]");
      if (!btn) return;
      state.type = btn.dataset.type;
      document.querySelectorAll(".chart-type-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      render();
    });
  }

  /* ---------- chart ---------- */
  const W = 640, H = 300, P = { t: 20, r: 16, b: 34, l: 40 };
  const plotW = W - P.l - P.r, plotH = H - P.t - P.b;

  function render() {
    const m = METRICS[state.metric];
    const labels = m.labels;
    const allVals = m.series.flatMap((s) => s.values);
    const maxV = Math.max(...allVals);
    const yMax = niceMax(maxV);
    const x = (i) => P.l + (i + 0.5) * (plotW / labels.length);
    const y = (v) => P.t + plotH - (v / yMax) * plotH;

    // gridlines + y labels
    const ticks = 4;
    let grid = "";
    for (let t = 0; t <= ticks; t++) {
      const val = (yMax / ticks) * t;
      const yy = y(val);
      grid += `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="bi-grid-line" />`;
      grid += `<text x="${P.l - 8}" y="${yy + 4}" text-anchor="end" class="bi-axis-label">${fmt(val, m.unit)}</text>`;
    }
    // x labels
    let xlabels = labels.map((s, i) => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" class="bi-axis-label">${s}</text>`).join("");

    let marks = "";
    if (state.type === "bar") {
      const groups = m.series.length;
      const band = plotW / labels.length;
      const bw = Math.min(22, (band * 0.7) / groups);
      m.series.forEach((s, si) => {
        s.values.forEach((v, i) => {
          const cx = x(i) - (groups * bw) / 2 + si * bw;
          const yy = y(v), h = P.t + plotH - yy;
          marks += `<rect x="${cx}" y="${yy}" width="${bw - 2}" height="${h}" rx="3" fill="${s.color}">`
                +  `<title>${s.name} · ${labels[i]}: ${fmt(v, m.unit)}</title></rect>`;
        });
      });
    } else {
      m.series.forEach((s) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const area = `${P.l},${P.t + plotH} ${pts} ${P.l + plotW},${P.t + plotH}`;
        marks += `<polygon points="${area}" fill="${s.color}" opacity="0.08" />`;
        marks += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`;
        s.values.forEach((v, i) => {
          marks += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="var(--surface)" stroke="${s.color}" stroke-width="2">`
                +  `<title>${s.name} · ${labels[i]}: ${fmt(v, m.unit)}</title></circle>`;
        });
      });
    }

    document.getElementById("bi-chart").innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" class="bi-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${m.title}">
        ${grid}${marks}${xlabels}
      </svg>`;

    document.getElementById("bi-chart-title").textContent = m.title;
    document.getElementById("bi-chart-sub").textContent = m.sub;
    document.getElementById("bi-legend").innerHTML = m.series.map((s) =>
      `<span class="bi-leg"><span class="legend-dot" style="background:${s.color}"></span>${s.name}</span>`).join("");

    renderKpis(m);
    document.getElementById("bi-insight").innerHTML = `<span class="bi-insight-ico">💡</span>${m.insight}`;
  }

  function renderKpis(m) {
    const labels = m.labels;
    const primary = m.series[m.series.length - 1];   // main series
    const vals = primary.values;
    const latest = vals[vals.length - 1];
    const first = vals[0];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const deltaPct = Math.round(((latest - first) / first) * 100);
    const improved = m.lowerBetter ? deltaPct < 0 : deltaPct > 0;
    const arrow = deltaPct > 0 ? "▲" : "▼";

    document.getElementById("bi-kpi-1").innerHTML =
      `<div class="bi-kpi-label">Latest (${labels[labels.length - 1]})</div>
       <div class="bi-kpi-value">${fmt(latest, m.unit)}</div>
       <div class="bi-kpi-delta ${improved ? "good" : "bad"}">${arrow} ${Math.abs(deltaPct)}% vs. ${labels[0]}</div>`;
    document.getElementById("bi-kpi-2").innerHTML =
      `<div class="bi-kpi-label">10-period average</div>
       <div class="bi-kpi-value">${fmt(avg, m.unit)}</div>
       <div class="bi-kpi-delta muted">${primary.name}</div>`;
  }

  /* ---------- helpers ---------- */
  function niceMax(v) {
    if (v <= 12) return Math.ceil(v / 2) * 2;
    if (v <= 100) return Math.ceil(v / 10) * 10;
    return Math.ceil(v / 20) * 20;
  }
  function fmt(v, unit) {
    const n = Math.round(v * 10) / 10;
    const s = Number.isInteger(n) ? n : n.toFixed(1);
    if (unit === "%") return `${s}%`;
    if (unit === "x") return `${s}x`;
    return `${s}`;
  }

  function init() {
    if (!document.getElementById("bi-app")) return;
    buildControls();
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
