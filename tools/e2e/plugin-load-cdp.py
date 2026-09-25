#!/usr/bin/env python3
"""Enable the installed production plugin inside an isolated Obsidian vault."""

import json
import os
import sys
import time
import urllib.request

import websocket


port = int(sys.argv[1])
output_dir = sys.argv[2]
expected_root = os.path.normcase(os.path.abspath(sys.argv[3]))
events = []
request_id = 0


def targets():
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2) as response:
        return [target for target in json.load(response) if target.get("type") == "page"]


def connect_target():
    deadline = time.time() + 45
    while time.time() < deadline:
        try:
            for target in targets():
                candidate = websocket.create_connection(
                    target["webSocketDebuggerUrl"], timeout=3,
                    origin=f"http://127.0.0.1:{port}",
                )
                candidate.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {
                    "expression": "globalThis.app?.vault?.adapter?.getBasePath()",
                    "returnByValue": True,
                }}))
                while True:
                    response = json.loads(candidate.recv())
                    if response.get("id") == 1:
                        root = response.get("result", {}).get("result", {}).get("value")
                        if root and os.path.normcase(root) == expected_root:
                            return candidate
                        candidate.close()
                        break
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError(f"CDP target for vault {expected_root} did not appear")


def call(ws, method, params=None):
    global request_id
    request_id += 1
    current_id = request_id
    ws.send(json.dumps({"id": current_id, "method": method, "params": params or {}}))
    while True:
        response = json.loads(ws.recv())
        if response.get("id") == current_id:
            if "error" in response:
                raise RuntimeError(f"CDP {method}: {response['error']}")
            return response.get("result", {})
        if response.get("method") in ("Runtime.exceptionThrown", "Runtime.consoleAPICalled", "Log.entryAdded"):
            events.append(response)


def evaluate(ws, expression):
    result = call(ws, "Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True,
    })
    if "exceptionDetails" in result:
        details = result["exceptionDetails"]
        raise RuntimeError(details.get("exception", {}).get("description") or details.get("text", "evaluation failed"))
    return result.get("result", {}).get("value")


report = {"status": "failed", "vault": expected_root, "events": events}
try:
    ws = connect_target()
    try:
        call(ws, "Runtime.enable")
        call(ws, "Log.enable")
        deadline = time.time() + 30
        while time.time() < deadline and not evaluate(ws, "Boolean(globalThis.app?.plugins?.manifests?.['obsidian-handbook'])"):
            time.sleep(0.25)
        if time.time() >= deadline:
            raise RuntimeError("Obsidian did not discover the installed Handbook manifest")
        # Subscribe before enabling: plugin import errors can precede onload.
        evaluate(ws, "app.plugins.setEnable(true)")
        report["enableResult"] = evaluate(ws, "app.plugins.enablePluginAndSave('obsidian-handbook')")
        if report["enableResult"] is False:
            raise RuntimeError("Obsidian refused to enable the installed plugin")
        deadline = time.time() + 30
        while time.time() < deadline:
            if evaluate(ws, "Boolean(app.plugins.plugins['obsidian-handbook'])"):
                report["status"] = "passed"
                break
            time.sleep(0.25)
        if report["status"] != "passed":
            raise RuntimeError("Handbook did not appear in app.plugins.plugins")
    finally:
        try:
            report["state"] = evaluate(ws, "({enabled:[...(app.plugins?.enabledPlugins || [])],loaded:Object.keys(app.plugins?.plugins || {}),manifests:Object.keys(app.plugins?.manifests || {}),api:Object.getOwnPropertyNames(Object.getPrototypeOf(app.plugins)).filter(key => /manifest|load|enable|save/i.test(key)),restricted:app.plugins.restrictedMode})")
        except Exception as error:
            report["stateError"] = str(error)
        ws.close()
except Exception as error:
    report["error"] = str(error)
finally:
    for event in events:
        params = event.get("params", {})
        if event.get("method") == "Runtime.exceptionThrown":
            details = params.get("exceptionDetails", {})
            report["loadException"] = details.get("exception", {}).get("description") or details.get("text")
            break
        if event.get("method") == "Runtime.consoleAPICalled" and params.get("type") == "error":
            args = params.get("args", [])
            report["loadException"] = next((arg.get("description") or arg.get("value") for arg in reversed(args) if arg.get("description") or arg.get("value")), None)
            break
    with open(os.path.join(output_dir, "plugin-load.json"), "w", encoding="utf-8") as output:
        json.dump(report, output, indent=2)
        output.write("\n")

if report["status"] != "passed":
    print(json.dumps({key: report.get(key) for key in ("status", "error", "loadException", "state")}, indent=2), file=sys.stderr)
    sys.exit(1)
print(json.dumps({"status": "passed", "loaded": report.get("state", {}).get("loaded", [])}))
