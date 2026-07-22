/* ============================================================================
   Shared project dataset for the Project Tracker.
   Embedded as a JS object so the site works by simply opening index.html
   (no server / no CORS issues). The identical data also lives in
   data/deliverables.csv, which the Python analytics script consumes.

   Business-analyst deliverables across e-commerce, travel, FMCG, and adtech —
   the domains Kanika actually works in.
   ============================================================================ */

const TODAY = "2026-07-22"; // reference "today" for on-time / overdue calculations

const CLIENTS = {
  "Cartly Commerce":  { color: "#6366f1", industry: "E-commerce" },
  "Voyara Travel":    { color: "#0ea5e9", industry: "Travel" },
  "Freshleaf FMCG":   { color: "#f59e0b", industry: "Consumer Goods" },
  "AdNova Media":     { color: "#10b981", industry: "AdTech" },
};

// status pipeline (order matters for the Kanban board)
const STATUSES = ["Backlog", "In Progress", "In Review", "Blocked", "Done"];

const PRIORITY = ["Critical", "High", "Medium", "Low"];

const DELIVERABLES = [
  // ---- Cartly Commerce : Checkout & Payments ----
  { id: "CC-101", jira: "CART-482", title: "Checkout requirements specification (BRD)",  client: "Cartly Commerce", project: "Checkout & Payments", type: "Requirements Doc",     status: "Done",        priority: "High",     owner: "Kanika Dhingra", start: "2026-05-04", due: "2026-05-22", progress: 100, points: 8, sprint: "Sprint 12", tags: ["requirements","stakeholders"] },
  { id: "CC-102", jira: "CART-485", title: "As-is vs. to-be checkout flow maps",         client: "Cartly Commerce", project: "Checkout & Payments", type: "Process Map",         status: "Done",        priority: "Medium",   owner: "Kanika Dhingra", start: "2026-05-11", due: "2026-05-29", progress: 100, points: 5, sprint: "Sprint 12", tags: ["process","BPMN"] },
  { id: "CC-103", jira: "CART-491", title: "Payment gateway integration user stories",   client: "Cartly Commerce", project: "Checkout & Payments", type: "User Stories",        status: "In Review",   priority: "High",     owner: "Kanika Dhingra", start: "2026-06-15", due: "2026-07-24", progress: 80,  points: 8, sprint: "Sprint 15", tags: ["agile","backlog"] },
  { id: "CC-104", jira: "CART-498", title: "Cart-abandonment analytics dashboard",       client: "Cartly Commerce", project: "Checkout & Payments", type: "Analytics Dashboard", status: "In Progress", priority: "High",     owner: "Kanika Dhingra", start: "2026-07-06", due: "2026-08-07", progress: 45,  points: 13, sprint: "Sprint 16", tags: ["python","data-viz","KPI"] },
  { id: "CC-105", jira: "CART-503", title: "Checkout UAT plan & acceptance criteria",    client: "Cartly Commerce", project: "Checkout & Payments", type: "UAT Plan",            status: "Backlog",     priority: "Medium",   owner: "Kanika Dhingra", start: "2026-07-27", due: "2026-08-21", progress: 0,   points: 5, sprint: "Sprint 17", tags: ["testing","UAT"] },

  // ---- Voyara Travel : Booking Funnel Revamp ----
  { id: "VT-201", jira: "VOY-77",  title: "Stakeholder analysis & RACI matrix",          client: "Voyara Travel", project: "Booking Funnel Revamp", type: "Stakeholder Analysis", status: "Done",        priority: "High",     owner: "Kanika Dhingra", start: "2026-04-20", due: "2026-05-08", progress: 100, points: 5, sprint: "Sprint 9",  tags: ["stakeholders","RACI"] },
  { id: "VT-202", jira: "VOY-83",  title: "Booking funnel requirements spec (BRD)",       client: "Voyara Travel", project: "Booking Funnel Revamp", type: "Requirements Doc",     status: "Done",        priority: "Critical", owner: "Kanika Dhingra", start: "2026-05-04", due: "2026-05-26", progress: 100, points: 8, sprint: "Sprint 10", tags: ["requirements","conversion"] },
  { id: "VT-203", jira: "VOY-91",  title: "Search & booking flow BPMN diagrams",         client: "Voyara Travel", project: "Booking Funnel Revamp", type: "Process Map",         status: "In Review",   priority: "High",     owner: "Kanika Dhingra", start: "2026-06-22", due: "2026-07-20", progress: 90,  points: 5, sprint: "Sprint 14", tags: ["process","BPMN"] },
  { id: "VT-204", jira: "VOY-96",  title: "Booking data migration mapping",              client: "Voyara Travel", project: "Booking Funnel Revamp", type: "Data Mapping",        status: "Blocked",     priority: "Critical", owner: "Kanika Dhingra", start: "2026-06-29", due: "2026-07-17", progress: 60,  points: 8, sprint: "Sprint 14", tags: ["data","SQL","migration"] },
  { id: "VT-205", jira: "VOY-104", title: "Accessibility (WCAG) requirements review",    client: "Voyara Travel", project: "Booking Funnel Revamp", type: "Requirements Doc",     status: "In Progress", priority: "Medium",   owner: "Kanika Dhingra", start: "2026-07-13", due: "2026-08-03", progress: 30,  points: 5, sprint: "Sprint 16", tags: ["accessibility","requirements"] },

  // ---- Freshleaf FMCG : Retail Insights Platform ----
  { id: "FL-301", jira: "LEAF-12", title: "Sales KPI baseline report",                   client: "Freshleaf FMCG", project: "Retail Insights Platform", type: "Analytics Dashboard", status: "Done",        priority: "High",     owner: "Kanika Dhingra", start: "2026-05-18", due: "2026-06-05", progress: 100, points: 8, sprint: "Sprint 11", tags: ["python","KPI","data-viz"] },
  { id: "FL-302", jira: "LEAF-19", title: "Trade-promotion requirements workshop",       client: "Freshleaf FMCG", project: "Retail Insights Platform", type: "Requirements Doc",     status: "Done",        priority: "Medium",   owner: "Kanika Dhingra", start: "2026-06-01", due: "2026-06-19", progress: 100, points: 5, sprint: "Sprint 13", tags: ["requirements","workshop"] },
  { id: "FL-303", jira: "LEAF-24", title: "Consumer insights data model",                client: "Freshleaf FMCG", project: "Retail Insights Platform", type: "Data Mapping",        status: "In Progress", priority: "High",     owner: "Kanika Dhingra", start: "2026-07-06", due: "2026-07-31", progress: 55,  points: 13, sprint: "Sprint 16", tags: ["data","SQL","modeling"] },
  { id: "FL-304", jira: "LEAF-31", title: "Promotion ROI business case",                 client: "Freshleaf FMCG", project: "Retail Insights Platform", type: "Business Case",       status: "In Progress", priority: "High",     owner: "Kanika Dhingra", start: "2026-07-13", due: "2026-07-28", progress: 40,  points: 8, sprint: "Sprint 16", tags: ["business-case","marketing"] },
  { id: "FL-305", jira: "LEAF-38", title: "Demand forecast dashboard v2",                client: "Freshleaf FMCG", project: "Retail Insights Platform", type: "Analytics Dashboard", status: "Backlog",     priority: "Medium",   owner: "Kanika Dhingra", start: "2026-08-03", due: "2026-08-28", progress: 0,   points: 8, sprint: "Sprint 18", tags: ["python","data-viz","KPI"] },

  // ---- AdNova Media : Attribution & Reporting ----
  { id: "AN-401", jira: "NOVA-55", title: "Campaign attribution requirements (BRD)",     client: "AdNova Media", project: "Attribution & Reporting", type: "Requirements Doc",     status: "Done",        priority: "Critical", owner: "Kanika Dhingra", start: "2026-05-25", due: "2026-06-16", progress: 100, points: 8, sprint: "Sprint 12", tags: ["requirements","attribution"] },
  { id: "AN-402", jira: "NOVA-61", title: "ROAS reporting dashboard",                    client: "AdNova Media", project: "Attribution & Reporting", type: "Analytics Dashboard", status: "Done",        priority: "High",     owner: "Kanika Dhingra", start: "2026-06-08", due: "2026-06-26", progress: 100, points: 8, sprint: "Sprint 13", tags: ["python","data-viz","ROAS"] },
  { id: "AN-403", jira: "NOVA-68", title: "Attribution business rules catalog",          client: "AdNova Media", project: "Attribution & Reporting", type: "Business Rules",      status: "In Review",   priority: "High",     owner: "Kanika Dhingra", start: "2026-06-29", due: "2026-07-23", progress: 85,  points: 8, sprint: "Sprint 15", tags: ["rules","logic"] },
  { id: "AN-404", jira: "NOVA-72", title: "Ad-platform API integration user stories",    client: "AdNova Media", project: "Attribution & Reporting", type: "User Stories",        status: "In Progress", priority: "Medium",   owner: "Kanika Dhingra", start: "2026-07-13", due: "2026-08-06", progress: 35,  points: 5, sprint: "Sprint 16", tags: ["agile","API"] },
  { id: "AN-405", jira: "NOVA-79", title: "Regression UAT scenarios",                    client: "AdNova Media", project: "Attribution & Reporting", type: "UAT Plan",            status: "Blocked",     priority: "High",     owner: "Kanika Dhingra", start: "2026-07-06", due: "2026-07-19", progress: 50,  points: 5, sprint: "Sprint 15", tags: ["testing","UAT"] },
  { id: "AN-406", jira: "NOVA-84", title: "Post-launch benefits realization plan",       client: "AdNova Media", project: "Attribution & Reporting", type: "Business Case",       status: "Backlog",     priority: "Low",      owner: "Kanika Dhingra", start: "2026-08-10", due: "2026-09-04", progress: 0,   points: 5, sprint: "Sprint 18", tags: ["business-case","metrics"] },
];

// Expose for app.js
window.TRACKER = { TODAY, CLIENTS, STATUSES, PRIORITY, DELIVERABLES };
