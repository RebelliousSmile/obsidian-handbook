#!/usr/bin/env python3
"""CDP assertions for Handbook layout regions in an isolated Obsidian vault."""

import base64
import json
import os
import sys
import time
import urllib.request

import websocket


port = int(sys.argv[1])
output_dir = sys.argv[2]
expected_root = os.path.normcase(os.path.abspath(sys.argv[3]))


def targets():
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1) as response:
        return [target for target in json.load(response) if target.get("type") == "page"]


def wait_for_target():
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            for page in targets():
                candidate = websocket.create_connection(
                    page["webSocketDebuggerUrl"],
                    timeout=2,
                    origin=f"http://127.0.0.1:{port}",
                )
                try:
                    candidate.send(
                        json.dumps(
                            {
                                "id": 1,
                                "method": "Runtime.evaluate",
                                "params": {
                                    "expression": "globalThis.app?.vault?.adapter?.getBasePath()",
                                    "returnByValue": True,
                                },
                            }
                        )
                    )
                    while True:
                        response = json.loads(candidate.recv())
                        if response.get("id") == 1:
                            root = response.get("result", {}).get("result", {}).get("value")
                            if root and os.path.normcase(root) == expected_root:
                                return page
                            break
                finally:
                    candidate.close()
        except Exception:
            pass
        time.sleep(0.2)
    raise RuntimeError(f"CDP page for temporary vault {expected_root} did not appear")


target = wait_for_target()
ws = websocket.create_connection(
    target["webSocketDebuggerUrl"], timeout=10, origin=f"http://127.0.0.1:{port}"
)
request_id = 0


def call(method, params=None):
    global request_id
    request_id += 1
    current_id = request_id
    ws.send(json.dumps({"id": current_id, "method": method, "params": params or {}}))
    while True:
        response = json.loads(ws.recv())
        if response.get("id") != current_id:
            continue
        if "error" in response:
            raise RuntimeError(response["error"])
        return response.get("result", {})


def evaluate(expression):
    result = call(
        "Runtime.evaluate",
        {"expression": expression, "returnByValue": True, "awaitPromise": True},
    )
    if "exceptionDetails" in result:
        raise RuntimeError(result["exceptionDetails"].get("text", "evaluation failed"))
    return result.get("result", {}).get("value")


def wait_for(expression, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if evaluate(expression):
            return
        time.sleep(0.2)
    raise RuntimeError(f"Timed out waiting for: {expression}")


def screenshot(filename):
    image = call("Page.captureScreenshot", {"format": "png"})
    with open(os.path.join(output_dir, filename), "wb") as output:
        output.write(base64.b64decode(image["data"]))


def set_width(width):
    try:
        window = call("Browser.getWindowForTarget", {"targetId": target["id"]})
        call(
            "Browser.setWindowBounds",
            {"windowId": window["windowId"], "bounds": {"width": width, "height": 800}},
        )
    except RuntimeError as error:
        if "wasn't found" not in str(error):
            raise
        call(
            "Emulation.setDeviceMetricsOverride",
            {"width": width, "height": 800, "deviceScaleFactor": 1, "mobile": False},
        )
    time.sleep(0.5)


wait_for("Boolean(globalThis.app?.vault && globalThis.app?.workspace)")
opened = evaluate(
    """
    (async () => {
      const file = app.vault.getAbstractFileByPath('layout-regions-probe.md');
      if (!file) return false;
      await app.workspace.getLeaf(false).openFile(file);
      return true;
    })()
    """
)
if not opened:
    visible = evaluate(
        "JSON.stringify({root: app.vault.adapter.getBasePath(), files: app.vault.getFiles().map(file => file.path)})"
    )
    raise RuntimeError(f"The layout-region probe could not be opened: {visible}")

if evaluate("app.workspace.getMostRecentLeaf()?.view?.getMode?.()") != "preview":
    evaluate("app.commands.executeCommandById('markdown:toggle-preview')")

wait_for("document.querySelectorAll('.handbook-layout-region').length === 2")
set_width(1200)
wait_for("document.querySelectorAll('.handbook-layout-region').length === 2")
wide = evaluate(
    """
    JSON.stringify([...document.querySelectorAll('.handbook-layout-region')].map(region => ({
      children: region.children.length,
      columns: getComputedStyle(region).gridTemplateColumns.trim().split(/\\s+/).length,
      variable: getComputedStyle(region).getPropertyValue('--handbook-layout-columns').trim(),
      blocks: region.querySelectorAll('.callout').length
    })))
    """
)
wide = json.loads(wide)
if wide != [
    {"children": 3, "columns": 3, "variable": "3", "blocks": 3},
    {"children": 1, "columns": 1, "variable": "1", "blocks": 0},
]:
    raise RuntimeError(f"Unexpected wide layout: {wide}")
screenshot("layout-regions-wide.png")

set_width(600)
wait_for("document.querySelectorAll('.handbook-layout-region').length === 2")
narrow = json.loads(
    evaluate(
        "JSON.stringify([...document.querySelectorAll('.handbook-layout-region')].map(region => ({columns: getComputedStyle(region).gridTemplateColumns.trim().split(/\\s+/).length, blocks: region.querySelectorAll('.callout').length})))"
    )
)
if narrow != [{"columns": 1, "blocks": 3}, {"columns": 1, "blocks": 0}]:
    raise RuntimeError(f"Unexpected narrow layout: {narrow}")
screenshot("layout-regions-narrow.png")

print(json.dumps({"narrow": narrow, "screenshots": ["layout-regions-wide.png", "layout-regions-narrow.png"], "wide": wide}))
