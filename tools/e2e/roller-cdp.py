#!/usr/bin/env python3
"""Exercise Handbook's table-scoped Roller menu against real Dice Roller."""

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


def find_target():
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            for target in targets():
                candidate = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=2, origin=f"http://127.0.0.1:{port}")
                try:
                    candidate.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {"expression": "globalThis.app?.vault?.adapter?.getBasePath()", "returnByValue": True}}))
                    while True:
                        response = json.loads(candidate.recv())
                        if response.get("id") == 1:
                            if os.path.normcase(response.get("result", {}).get("result", {}).get("value", "")) == expected_root:
                                return target
                            break
                finally:
                    candidate.close()
        except Exception:
            pass
        time.sleep(0.2)
    raise RuntimeError("CDP page for temporary Roller vault did not appear")


target = find_target()
ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=10, origin=f"http://127.0.0.1:{port}")
request_id = 0


def call(method, params=None):
    global request_id
    request_id += 1
    ws.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
    while True:
        response = json.loads(ws.recv())
        if response.get("id") != request_id:
            continue
        if "error" in response:
            raise RuntimeError(response["error"])
        return response.get("result", {})


def evaluate(expression):
    result = call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
    if "exceptionDetails" in result:
        raise RuntimeError(result["exceptionDetails"].get("text", "evaluation failed"))
    return result.get("result", {}).get("value")


ACTIVE_ROLLER_TABLES = """(() => {
    const root = app.workspace.getMostRecentLeaf()?.view?.containerEl;
    if (!root) return [];
    return [...root.querySelectorAll('.brumes-roller--table')]
        .map((table) => {
            const rect = table.getBoundingClientRect();
            const style = getComputedStyle(table);
            return {
                x: rect.left + Math.min(20, rect.width / 2),
                y: rect.top + Math.min(20, rect.height / 2),
                visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
            };
        })
        .filter((table) => table.visible);
})()"""


def visible_roller_tables():
    return json.loads(evaluate("JSON.stringify(" + ACTIVE_ROLLER_TABLES + ")"))


def wait_for_visible_roller_tables(expected=2, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if len(visible_roller_tables()) == expected:
            return
        time.sleep(0.2)
    wait_for(f"visible Roller table count === {expected}", timeout=0)


def wait_for(expression, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if evaluate(expression):
            return
        time.sleep(0.2)
    screenshot("roller-timeout.png")
    state = evaluate("JSON.stringify((() => { const root = app.workspace.getMostRecentLeaf()?.view?.containerEl; return {enabled: [...(app.plugins?.enabledPlugins || [])], loaded: Object.keys(app.plugins?.plugins || {}), mode: app.workspace.getMostRecentLeaf()?.view?.getMode?.(), activeFile: app.workspace.getMostRecentLeaf()?.view?.file?.path, rendered: document.querySelectorAll('.brumes-roller--table').length, scoped: root?.querySelectorAll('.brumes-roller--table').length ?? 0, visible: " + ACTIVE_ROLLER_TABLES + ".length, preview: document.querySelector('.markdown-preview-sizer')?.innerText.slice(0, 500), modal: document.querySelector('.modal-container')?.innerText.slice(0, 1000), files: app.vault.getFiles().map(file => file.path).slice(0, 10)}; })())")
    raise RuntimeError(f"Timed out waiting for: {expression}; state: {state}")


def screenshot(name):
    image = call("Page.captureScreenshot", {"format": "png"})
    with open(os.path.join(output_dir, name), "wb") as output:
        output.write(base64.b64decode(image["data"]))


def right_click_table(index):
    tables = visible_roller_tables()
    if index >= len(tables):
        raise RuntimeError(f"Roller table {index} has no clickable rectangle")
    rect = tables[index]
    call("Input.dispatchMouseEvent", {"type": "mousePressed", "x": rect["x"], "y": rect["y"], "button": "right", "buttons": 2, "clickCount": 1})
    call("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": rect["x"], "y": rect["y"], "button": "right", "buttons": 0, "clickCount": 1})
    wait_for("[...document.querySelectorAll('.menu-item-title')].some(item => item.textContent === 'Roll and copy result')")


def choose_roll():
    evaluate("(() => { const title = [...document.querySelectorAll('.menu-item-title')].find(item => item.textContent === 'Roll and copy result'); const item = title?.closest('.menu-item'); if (!item) throw new Error('Roller menu item was not visible'); item.click(); return true; })()")


wait_for("Boolean(globalThis.app?.vault && globalThis.app?.workspace)")
wait_for("Boolean(app.vault.getAbstractFileByPath('roller.md'))")
wait_for("""(() => { const modal = document.querySelector('.mod-trust-folder'); const button = [...(modal?.querySelectorAll('button') || [])].pop(); button?.click(); return app.plugins.isEnabled() && !document.querySelector('.mod-trust-folder'); })()""")
wait_for("Boolean(app.plugins.plugins['obsidian-handbook'] && app.plugins.plugins['obsidian-dice-roller'])")
# A fresh vault can show Handbook's starter-kit prompt. It swallows editor
# commands, so dismiss it before deliberately entering reading mode.
time.sleep(2)
wait_for("(() => { document.querySelectorAll('.modal-container .modal-header-button, .modal-container .modal-close-button').forEach(button => button.click()); return !document.querySelector('.modal-container'); })()")
evaluate("(async () => { await app.workspace.getLeaf(false).openFile(app.vault.getAbstractFileByPath('roller.md')); return true; })()")
wait_for("app.workspace.getMostRecentLeaf()?.view?.file?.path === 'roller.md'")
# Obsidian 1.13 can retain a stale reading view after URI startup. Force a
# source -> reading transition so its code-block processors run for this note.
if evaluate("app.workspace.getMostRecentLeaf()?.view?.getMode?.()") == "preview":
    evaluate("app.commands.executeCommandById('markdown:toggle-preview')")
    wait_for("app.workspace.getMostRecentLeaf()?.view?.getMode?.() === 'source'")
if evaluate("app.workspace.getMostRecentLeaf()?.view?.getMode?.()") != "preview":
    evaluate("app.commands.executeCommandById('markdown:toggle-preview')")
wait_for("app.workspace.getMostRecentLeaf()?.view?.getMode?.() === 'preview'")
evaluate("app.plugins.plugins['obsidian-handbook'].applySettings({refreshMarkdown: true})")
wait_for_visible_roller_tables()

values = [["First option", "Second option"], ["Low result", "High result"]]
results = []
for index, expected in enumerate(values):
    evaluate("require('electron').clipboard.writeText('roller-sentinel')")
    right_click_table(index)
    screenshot(f"roller-menu-{index + 1}.png")
    choose_roll()
    wait_for("require('electron').clipboard.readText() !== 'roller-sentinel'")
    value = evaluate("require('electron').clipboard.readText()")
    if value not in expected:
        raise RuntimeError(f"Table {index} copied {value!r}, not one of {expected}")
    results.append(value)

source_before = evaluate("app.vault.adapter.read('roller.md')")
evaluate("require('electron').clipboard.writeText('roller-sentinel')")
evaluate("(async () => { await app.plugins.disablePlugin('obsidian-dice-roller'); return true; })()")
wait_for("!app.plugins.getPlugin('obsidian-dice-roller')")
right_click_table(0)
choose_roll()
wait_for("[...document.querySelectorAll('.notice')].some(notice => notice.textContent?.includes('Dice roller must be enabled'))")
if evaluate("require('electron').clipboard.readText()") != "roller-sentinel":
    raise RuntimeError("Missing Dice Roller changed the clipboard")
if evaluate("app.vault.adapter.read('roller.md')") != source_before:
    raise RuntimeError("Missing Dice Roller changed the source note")
screenshot("roller-missing-dependency.png")

with open(os.path.join(output_dir, "REPORT.json"), "w", encoding="utf-8") as output:
    json.dump({"results": results, "missingDependency": "clipboard and source unchanged"}, output, indent=2)
print(json.dumps({"results": results, "report": os.path.join(output_dir, "REPORT.json")}))
