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
    diagnostic = evaluate("JSON.stringify({enabled: [...(app.plugins?.enabledPlugins || [])], loaded: Object.keys(app.plugins?.plugins || {}), isEnabled: app.plugins?.isEnabled?.(), mode: app.workspace.getMostRecentLeaf()?.view?.getMode?.(), activeFile: app.workspace.getMostRecentLeaf()?.view?.file?.path, preview: document.querySelector('.markdown-preview-sizer')?.innerText.slice(0, 500), modal: document.querySelector('.modal-container')?.innerText.slice(0, 1000), buttons: [...document.querySelectorAll('.modal-container button')].map(button => button.innerText), files: app.vault.getFiles().map(file => file.path).slice(0, 10)})")
    raise RuntimeError(f"Timed out waiting for: {expression}; state: {diagnostic}")


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
wait_for("Boolean(app.vault.getAbstractFileByPath('layout-regions-probe.md'))")
# Obsidian asks whether to trust a first-time vault that already has plugins.
# This vault and its only plugin were created by the journey itself.
wait_for("""
    (() => {
      const trustModal = document.querySelector('.mod-trust-folder');
      const trustButton = [...(trustModal?.querySelectorAll('button') || [])]
        .find(button => button.textContent?.includes('Trust author and enable plugins'));
      trustButton?.click();
      return app.plugins.isEnabled() && !document.querySelector('.mod-trust-folder');
    })()
    """)
wait_for("Boolean(app.plugins.plugins['obsidian-handbook'])")
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

if evaluate("app.workspace.getMostRecentLeaf()?.view?.getMode?.()") == "preview":
    evaluate("app.commands.executeCommandById('markdown:toggle-preview')")
    wait_for("app.workspace.getMostRecentLeaf()?.view?.getMode?.() === 'source'")
if evaluate("app.workspace.getMostRecentLeaf()?.view?.getMode?.()") != "preview":
    evaluate("app.commands.executeCommandById('markdown:toggle-preview')")
    wait_for("app.workspace.getMostRecentLeaf()?.view?.getMode?.() === 'preview'")
evaluate("app.plugins.plugins['obsidian-handbook'].applySettings({refreshMarkdown: true})")

wait_for("document.querySelectorAll('.handbook-layout-region').length === 2")
wait_for("(() => { document.querySelectorAll('.modal-container .modal-header-button, .modal-container .modal-close-button').forEach(button => button.click()); return !document.querySelector('.modal-container'); })()")
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

# A game theme can also flow the complete note into two editorial columns.
# A local layout region needs the full note width for its own three columns.
game_classes = ["brumes--adrenaline", "brumes--urban-shadows", "brumes--monsterhearts"]
original_game_classes = json.loads(evaluate(
    "JSON.stringify([...document.body.classList].filter(name => name.startsWith('brumes--')))"
))
evaluate("document.body.classList.remove('brumes--adrenaline', 'brumes--urban-shadows', 'brumes--monsterhearts')")
evaluate("document.body.classList.add('brumes--adrenaline')")
adrenaline = json.loads(evaluate("""
    JSON.stringify({
      editorialColumns: getComputedStyle(document.querySelector('.markdown-preview-sizer')).columnCount,
      regionColumns: getComputedStyle(document.querySelector('.handbook-layout-region')).gridTemplateColumns.trim().split(/\\s+/).length
    })
    """))
if adrenaline != {"editorialColumns": "1", "regionColumns": 3}:
    raise RuntimeError(f"Adrenaline theme fragmented the three-column region: {adrenaline}")
evaluate("document.body.classList.remove('brumes--adrenaline')")
evaluate("document.body.classList.add('brumes--monsterhearts')")
evaluate("app.workspace.leftSplit.collapse()")
set_width(750)
wait_for("document.querySelectorAll('.handbook-layout-region').length === 2")
game_layout = json.loads(evaluate("""
    JSON.stringify((() => {
      const sizer = document.querySelector('.markdown-preview-sizer');
      const region = document.querySelector('.handbook-layout-region');
      const columns = [...region.children].map(column => ({
        left: column.getBoundingClientRect().left,
        top: column.getBoundingClientRect().top
      }));
      return {
        editorialColumns: getComputedStyle(sizer).columnCount,
        regionColumns: getComputedStyle(region).gridTemplateColumns.trim().split(/\\s+/).length,
        sizerWidth: sizer.getBoundingClientRect().width,
        sectionWidth: region.parentElement.getBoundingClientRect().width,
        columns
      };
    })())
    """))
if game_layout["editorialColumns"] != "1" or game_layout["regionColumns"] != 3 or not (
    game_layout["columns"][0]["left"] < game_layout["columns"][1]["left"] < game_layout["columns"][2]["left"]
) or len({column["top"] for column in game_layout["columns"]}) != 1:
    raise RuntimeError(f"Game theme fragmented the three-column region: {game_layout}")
screenshot("layout-regions-game-theme.png")
evaluate("document.body.classList.remove('brumes--monsterhearts')")
for game_class in original_game_classes:
    if game_class in game_classes:
        evaluate(f"document.body.classList.add('{game_class}')")
set_width(1200)

evaluate("document.querySelector('.markdown-preview-section').style.width = '500px'")
wait_for("document.querySelector('.handbook-layout-region') && getComputedStyle(document.querySelector('.handbook-layout-region')).gridTemplateColumns.trim().split(/\\s+/).length === 1")
screenshot("layout-regions-narrow-pane.png")
evaluate("document.querySelector('.markdown-preview-section').style.removeProperty('width')")
wait_for("document.querySelector('.handbook-layout-region') && getComputedStyle(document.querySelector('.handbook-layout-region')).gridTemplateColumns.trim().split(/\\s+/).length === 3")

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

print(json.dumps({"adrenaline": adrenaline, "game": game_layout, "narrow": narrow, "screenshots": ["layout-regions-wide.png", "layout-regions-game-theme.png", "layout-regions-narrow-pane.png", "layout-regions-narrow.png"], "wide": wide}))
