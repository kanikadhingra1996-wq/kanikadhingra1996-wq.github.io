"""
Jira → deliverables loader.

Runs the configured JQL against Jira Cloud's REST API (v3) with Basic auth
(email + API token) and maps issues into the shared deliverable shape,
translating Jira status names into the tracker's five board columns.
"""
from __future__ import annotations

from typing import List, Dict

STATUS_MAP = {
    "To Do": "Backlog", "Backlog": "Backlog",
    "In Progress": "In Progress",
    "In Review": "In Review", "Review": "In Review",
    "Blocked": "Blocked",
    "Done": "Done",
}

PRIORITY_MAP = {
    "Highest": "Critical", "Critical": "Critical",
    "High": "High", "Medium": "Medium",
    "Low": "Low", "Lowest": "Low",
}

# Default Jira Cloud "Story Points" custom field. Override if your instance differs.
STORY_POINTS_FIELD = "customfield_10016"


def fetch_deliverables(cfg) -> List[Dict]:
    import requests  # lazy import

    if not cfg.host or not cfg.email or not cfg.api_token:
        raise RuntimeError("Jira enabled but JIRA_HOST / JIRA_EMAIL / JIRA_API_TOKEN missing")

    url = f"https://{cfg.host}/rest/api/3/search"
    auth = (cfg.email, cfg.api_token)
    issues: List[Dict] = []
    start_at = 0

    while True:
        resp = requests.post(
            url,
            auth=auth,
            json={
                "jql": cfg.jql,
                "startAt": start_at,
                "maxResults": 100,
                "fields": ["summary", "status", "priority", "assignee",
                           "duedate", "created", "labels", "project",
                           "issuetype", STORY_POINTS_FIELD],
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        issues.extend(_normalize(i) for i in data.get("issues", []))
        start_at += data.get("maxResults", 100)
        if start_at >= data.get("total", 0):
            break

    return issues


def _normalize(issue: Dict) -> Dict:
    f = issue.get("fields", {})
    raw_status = (f.get("status") or {}).get("name", "To Do")
    raw_prio = (f.get("priority") or {}).get("name", "Medium")
    project = (f.get("project") or {}).get("name", "Unassigned")
    assignee = (f.get("assignee") or {}).get("displayName", "Unassigned")
    status = STATUS_MAP.get(raw_status, "Backlog")
    return {
        "id": issue.get("key"),
        "jira": issue.get("key"),
        "title": f.get("summary", ""),
        "client": project,
        "project": project,
        "type": (f.get("issuetype") or {}).get("name", "Task"),
        "status": status,
        "priority": PRIORITY_MAP.get(raw_prio, "Medium"),
        "owner": assignee,
        "start": (f.get("created") or "")[:10],
        "due": f.get("duedate") or "",
        "progress": 100 if status == "Done" else 0,
        "points": int(f.get(STORY_POINTS_FIELD) or 0),
        "sprint": "",
        "tags": ";".join(f.get("labels", [])),
    }
