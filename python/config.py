"""
Configuration & feature flags for the Python analytics layer.

Flags are read from environment variables so no secret ever lives in the repo.
By default everything is OFF and the analytics script reads the local CSV —
exactly the data the website ships with. Flip a flag (and provide creds via a
.env file or your shell) to pull live data instead.

    export USE_AIRTABLE=1
    export AIRTABLE_API_KEY=pat_xxx
    export AIRTABLE_BASE_ID=appXXXX
    ...

See .env.example for the full list.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


def _flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class AirtableConfig:
    enabled: bool = False
    api_key: str = ""
    base_id: str = ""
    table: str = "Deliverables"


@dataclass(frozen=True)
class JiraConfig:
    enabled: bool = False
    host: str = ""            # your-domain.atlassian.net
    email: str = ""
    api_token: str = ""
    jql: str = "project in (NWR, MHP, FLEET, VFO) ORDER BY updated DESC"


@dataclass(frozen=True)
class Config:
    today: str = "2026-07-22"
    csv_path: str = "data/deliverables.csv"
    airtable: AirtableConfig = AirtableConfig()
    jira: JiraConfig = JiraConfig()

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            today=os.getenv("TRACKER_TODAY", "2026-07-22"),
            csv_path=os.getenv("TRACKER_CSV", "data/deliverables.csv"),
            airtable=AirtableConfig(
                enabled=_flag("USE_AIRTABLE"),
                api_key=os.getenv("AIRTABLE_API_KEY", ""),
                base_id=os.getenv("AIRTABLE_BASE_ID", ""),
                table=os.getenv("AIRTABLE_TABLE", "Deliverables"),
            ),
            jira=JiraConfig(
                enabled=_flag("USE_JIRA"),
                host=os.getenv("JIRA_HOST", ""),
                email=os.getenv("JIRA_EMAIL", ""),
                api_token=os.getenv("JIRA_API_TOKEN", ""),
                jql=os.getenv("JIRA_JQL", JiraConfig.jql),
            ),
        )
