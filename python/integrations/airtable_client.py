"""
Airtable → deliverables loader.

Fetches all rows from the configured base/table and returns a list of dicts
matching the columns in data/deliverables.csv, so the rest of the analytics
pipeline is source-agnostic.

Only depends on `requests` (added to requirements.txt). Import is lazy so the
CSV path never requires it.
"""
from __future__ import annotations

from typing import List, Dict


def fetch_deliverables(cfg) -> List[Dict]:
    import requests  # lazy import — only needed in live mode

    if not cfg.api_key or not cfg.base_id:
        raise RuntimeError("Airtable enabled but AIRTABLE_API_KEY / AIRTABLE_BASE_ID missing")

    url = f"https://api.airtable.com/v0/{cfg.base_id}/{cfg.table}"
    headers = {"Authorization": f"Bearer {cfg.api_key}"}
    records: List[Dict] = []
    params = {"pageSize": 100}

    while True:
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        records.extend(_normalize(r) for r in data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
        params["offset"] = offset

    return records


def _normalize(record: Dict) -> Dict:
    f = record.get("fields", {})
    tags = f.get("tags", "")
    if isinstance(tags, str):
        tags = [t for t in tags.replace(",", ";").split(";") if t]
    return {
        "id": f.get("id", record.get("id")),
        "jira": f.get("jira", ""),
        "title": f.get("title", ""),
        "client": f.get("client", "Unassigned"),
        "project": f.get("project", ""),
        "type": f.get("type", ""),
        "status": f.get("status", "Backlog"),
        "priority": f.get("priority", "Medium"),
        "owner": f.get("owner", ""),
        "start": f.get("start", ""),
        "due": f.get("due", ""),
        "progress": int(f.get("progress", 0) or 0),
        "points": int(f.get("points", 0) or 0),
        "sprint": f.get("sprint", ""),
        "tags": ";".join(tags) if isinstance(tags, list) else tags,
    }
