#!/usr/bin/env python3
"""Capture one PbtA playbook block in an isolated Obsidian vault, as PNG and outerHTML."""

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
game = sys.argv[4]
WIDTH = 1400
# The widest match is the block itself, not a nested copy of the root class.
BLOCK = f"[...document.querySelectorAll('.handbook-{game}-playbook')].sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0]"


def targets():
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1) as response:
        return [target for target in json.load(response) if target.get("type") == "page"]


def connect():
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            for page in targets():
                candidate = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=5, origin=f"http://127.0.0.1:{port}")
                candidate.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {"expression": "globalThis.app?.vault?.adapter?.getBasePath()", "returnByValue": True}}))
                while True:
                    message = json.loads(candidate.recv())
                    if message.get("id") == 1:
                        break
                root = message.get("result", {}).get("result", {}).get("value")
                if root and os.path.normcase(root) == expected_root:
                    return candidate
                candidate.close()
        except Exception:
            pass
        time.sleep(0.3)
    sys.exit("The temporary vault did not open in Obsidian.")


ws = connect()
request_id = [1]


def call(method, params=None):
    request_id[0] += 1
    current = request_id[0]
    ws.send(json.dumps({"id": current, "method": method, "params": params or {}}))
    while True:
        message = json.loads(ws.recv())
        if message.get("id") == current:
            if "error" in message:
                raise RuntimeError(message["error"])
            return message.get("result", {})


def evaluate(expression):
    result = call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
    if "exceptionDetails" in result:
        raise RuntimeError(json.dumps(result["exceptionDetails"])[:800])
    return result.get("result", {}).get("value")


def wait_until(expression, timeout=60):
    started = time.time()
    while time.time() - started < timeout:
        try:
            if evaluate(expression):
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def require(expression, timeout=60):
    if not wait_until(expression, timeout):
        sys.exit("Timed out waiting for: " + expression[:100])


require("Boolean(globalThis.app?.vault && app.workspace && app.vault.getAbstractFileByPath('playbook-probe.md'))")
# Accept the "trust this folder" modal so community plugins load.
require("(()=>{const m=document.querySelector('.mod-trust-folder');[...(m?.querySelectorAll('button')||[])].pop()?.click();return app.plugins.isEnabled()&&!document.querySelector('.mod-trust-folder')})()")
require("Boolean(app.plugins.plugins['obsidian-handbook'])")
time.sleep(2)
require("(()=>{document.querySelectorAll('.modal-container .modal-close-button').forEach(b=>b.click());return !document.querySelector('.modal-container')})()", 20)
evaluate("(async()=>{const leaf=app.workspace.getLeaf(false);await leaf.openFile(app.vault.getAbstractFileByPath('playbook-probe.md'),{state:{mode:'preview'}});return 1})()")
if not wait_until(f"Boolean({BLOCK})"):
    print(evaluate("JSON.stringify({body:document.body.className,text:document.querySelector('.markdown-preview-sizer')?.innerText?.slice(0,600)})"))
    sys.exit(f"No .handbook-{game}-playbook block was rendered.")
time.sleep(3)  # pack fonts and illustrations

height = evaluate(f"{BLOCK}.scrollHeight")
call("Emulation.setDeviceMetricsOverride", {"width": WIDTH, "height": max(900, height + 400), "deviceScaleFactor": 1, "mobile": False})
time.sleep(2)
evaluate(f"{BLOCK}.scrollIntoView({{block:'start'}})")
time.sleep(1)
box = json.loads(evaluate(f"JSON.stringify((()=>{{const b={BLOCK}.getBoundingClientRect();return {{x:b.x,y:b.y,width:b.width,height:b.height}}}})())"))
image = call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True, "clip": {**box, "scale": 1}})
png = os.path.join(output_dir, f"handbook-{game}-{WIDTH}.png")
with open(png, "wb") as handle:
    handle.write(base64.b64decode(image["data"]))
with open(os.path.join(output_dir, f"handbook-{game}.html"), "w", encoding="utf-8") as handle:
    handle.write(evaluate(f"{BLOCK}.outerHTML"))
print(f"{game}: {png} ({int(box['width'])}x{int(box['height'])})")
