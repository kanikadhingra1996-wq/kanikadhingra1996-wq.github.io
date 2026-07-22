#!/usr/bin/env python3
"""
Project delivery-health analytics.

Computes the same KPIs the website dashboard shows, from whichever data source
is configured:

    • default            → data/deliverables.csv  (ships with the site)
    • USE_AIRTABLE=1     → live Airtable base
    • USE_JIRA=1         → live Jira project(s)

Outputs:
    • a delivery-health report to stdout
    • data/status_counts.json  (consumed by the web dashboard if you wire it up)
    • data/metrics.json        (headline KPIs)

Run:
    cd kanika-ba-portfolio
    python3 python/project_analytics.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

# make `python/` imports work no matter where we're invoked from
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))

from config import Config  # noqa: E402


# ----------------------------------------------------------------------------
# Load data — source chosen by feature flags
# ----------------------------------------------------------------------------
def load_dataframe(cfg: Config) -> tuple[pd.DataFrame, str]:
    if cfg.airtable.enabled:
        from integrations import airtable_client
        rows = airtable_client.fetch_deliverables(cfg.airtable)
        return pd.DataFrame(rows), "Airtable (live)"

    if cfg.jira.enabled:
        from integrations import jira_client
        rows = jira_client.fetch_deliverables(cfg.jira)
        return pd.DataFrame(rows), "Jira (live)"

    csv = ROOT / cfg.csv_path
    return pd.read_csv(csv), f"CSV ({cfg.csv_path})"


# ----------------------------------------------------------------------------
# Analysis
# ----------------------------------------------------------------------------
def analyze(df: pd.DataFrame, today: pd.Timestamp) -> dict:
    df = df.copy()
    df["due"] = pd.to_datetime(df["due"], errors="coerce")
    df["start"] = pd.to_datetime(df["start"], errors="coerce")

    done = df[df.status == "Done"]
    open_items = df[df.status != "Done"]
    overdue = open_items[open_items.due < today]
    blocked = df[df.status == "Blocked"]
    wip = df[df.status.isin(["In Progress", "In Review"])]

    # Delivery health proxies (dataset has no separate completion date):
    #   completion_rate → share of all deliverables that are Done
    #   on_track_rate   → share of OPEN work that is neither overdue nor blocked
    completion_rate = len(done) / len(df) if len(df) else 0.0
    at_risk = overdue.index.union(blocked[blocked.status != "Done"].index)
    on_track_rate = (
        1 - len(open_items.index.intersection(at_risk)) / len(open_items)
        if len(open_items) else 1.0
    )

    workload = (
        df.groupby("client")
        .agg(points=("points", "sum"),
             open_items=("status", lambda s: (s != "Done").sum()))
        .sort_values("points", ascending=False)
    )

    status_counts = df.groupby("status").size().to_dict()

    return {
        "source_rows": int(len(df)),
        "completed": int(len(done)),
        "in_progress": int(len(wip)),
        "overdue_open": int(len(overdue)),
        "blocked": int(len(blocked)),
        "completion_rate": round(completion_rate, 3),
        "on_track_rate": round(on_track_rate, 3),
        "total_points": int(df["points"].sum()),
        "status_counts": {k: int(v) for k, v in status_counts.items()},
        "workload": workload,
    }


# ----------------------------------------------------------------------------
# Report
# ----------------------------------------------------------------------------
def print_report(source: str, m: dict) -> None:
    line = "─" * 52
    print(f"\n{line}")
    print("  PROJECT DELIVERY-HEALTH REPORT")
    print(f"  source: {source}")
    print(line)
    print(f"  Deliverables tracked : {m['source_rows']}")
    print(f"  Completed            : {m['completed']}  ({m['completion_rate']:.0%})")
    print(f"  In progress          : {m['in_progress']}")
    print(f"  On-track (open work)  : {m['on_track_rate']:.0%}")
    print(f"  Overdue & open       : {m['overdue_open']}")
    print(f"  Blocked              : {m['blocked']}")
    print(f"  Total story points   : {m['total_points']}")
    print(line)
    print("  Workload by client (story points / open items)")
    for client, row in m["workload"].iterrows():
        print(f"    {client:<20} {int(row['points']):>3} pts   {int(row['open_items'])} open")
    print(line)
    print("  Status distribution")
    for status, n in m["status_counts"].items():
        bar = "█" * n
        print(f"    {status:<14} {bar} {n}")
    print(f"{line}\n")


def main() -> int:
    cfg = Config.from_env()
    today = pd.Timestamp(cfg.today)

    try:
        df, source = load_dataframe(cfg)
    except Exception as err:  # live source failed → fall back to CSV
        print(f"[warn] live source failed ({err}); falling back to CSV", file=sys.stderr)
        df = pd.read_csv(ROOT / cfg.csv_path)
        source = f"CSV ({cfg.csv_path}) [fallback]"

    m = analyze(df, today)
    print_report(source, m)

    # exports for the website / downstream use
    data_dir = ROOT / "data"
    (data_dir / "status_counts.json").write_text(json.dumps(m["status_counts"], indent=2))
    headline = {k: v for k, v in m.items() if k != "workload"}
    (data_dir / "metrics.json").write_text(json.dumps(headline, indent=2))
    print(f"→ wrote {data_dir/'status_counts.json'} and {data_dir/'metrics.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
