"""Pushes model/create-body.json to the existing 'sm_retail_explorer' semantic model and refreshes it.

Usage: python deploy_model.py <workspaceId> <modelId> [--recreate]
Requires an `az login` session in the tenant that owns the workspace.
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BODY = Path(__file__).parent.parent / "model" / "create-body.json"
FABRIC = "https://api.fabric.microsoft.com/v1"
PBI = "https://api.powerbi.com/v1.0/myorg"


def token(resource: str) -> str:
    return subprocess.check_output(["az", "account", "get-access-token", "--resource", resource, "--query", "accessToken", "-o", "tsv"], text=True).strip()


def call(method: str, url: str, resource: str, body: dict | None = None) -> tuple[int, dict, dict]:
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Authorization", f"Bearer {token(resource)}")
    req.add_header("Content-Type", "application/json")
    req.add_header("x-ms-fabric-skill", "semantic-model-authoring")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, dict(r.headers), json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), json.loads(e.read() or b"{}")


def main(ws: str, model: str, recreate: bool = False) -> None:
    if recreate:
        status, _, _ = call("DELETE", f"{FABRIC}/workspaces/{ws}/semanticModels/{model}", "https://api.fabric.microsoft.com")
        print("delete", status)
        status, headers, _ = call("POST", f"{FABRIC}/workspaces/{ws}/semanticModels", "https://api.fabric.microsoft.com", json.loads(BODY.read_text()))
        print("create", status)
        op = headers.get("x-ms-operation-id") or headers.get("Location", "").rsplit("/", 1)[-1]
        while True:
            _, _, s = call("GET", f"{FABRIC}/operations/{op}", "https://api.fabric.microsoft.com")
            if s.get("status") in ("Succeeded", "Failed"):
                print("operation", s.get("status"), s.get("error") or "")
                if s.get("status") == "Failed":
                    sys.exit(1)
                break
            time.sleep(4)
        _, _, items = call("GET", f"{FABRIC}/workspaces/{ws}/semanticModels", "https://api.fabric.microsoft.com")
        model = next(i["id"] for i in items["value"] if i["displayName"] == "sm_retail_explorer")
        print("model id", model)
    else:
        update(ws, model)
    refresh(ws, model)


def update(ws: str, model: str) -> None:
    definition = json.loads(BODY.read_text())["definition"]
    status, headers, body = call("POST", f"{FABRIC}/workspaces/{ws}/semanticModels/{model}/updateDefinition", "https://api.fabric.microsoft.com", {"definition": definition})
    print("updateDefinition", status)
    if status == 202:
        op = headers.get("x-ms-operation-id") or headers.get("Location", "").rsplit("/", 1)[-1]
        while True:
            _, _, s = call("GET", f"{FABRIC}/operations/{op}", "https://api.fabric.microsoft.com")
            if s.get("status") in ("Succeeded", "Failed"):
                print("operation", s.get("status"), s.get("error") or "")
                if s.get("status") == "Failed":
                    sys.exit(1)
                break
            time.sleep(4)
    elif status >= 300:
        print(body)
        sys.exit(1)


def refresh(ws: str, model: str) -> None:
    status, _, body = call("POST", f"{PBI}/groups/{ws}/datasets/{model}/refreshes", "https://analysis.windows.net/powerbi/api", {"type": "full"})
    print("refresh submitted", status, body or "")
    while True:
        time.sleep(5)
        _, _, r = call("GET", f"{PBI}/groups/{ws}/datasets/{model}/refreshes?$top=1", "https://analysis.windows.net/powerbi/api")
        last = r["value"][0]
        if last["status"] not in ("Unknown", "InProgress", "NotStarted"):
            print("refresh", last["status"], last.get("serviceExceptionJson") or "")
            sys.exit(0 if last["status"] == "Completed" else 1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], recreate="--recreate" in sys.argv)
