#!/usr/bin/env python3
"""Capture one PbtA playbook block in an isolated Obsidian vault, as PNG and outerHTML.

With a fifth argument `pdf`, also print the note the way Obsidian's PDF export does (a `.print`
child of `body`, light theme, print media) and check the paper: white page, a single column,
no Type 3 font, no region cut across two pages. A sixth argument `false` turns the
printer-friendly export off (the vault setting), which must keep the note's own background.
"""

import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

import websocket


port = int(sys.argv[1])
output_dir = sys.argv[2]
expected_root = os.path.normcase(os.path.abspath(sys.argv[3]))
game = sys.argv[4]
export_pdf = len(sys.argv) > 5 and sys.argv[5] == "pdf"
printer_friendly = not (len(sys.argv) > 6 and sys.argv[6] == "false")
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
                candidate = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30, origin=f"http://127.0.0.1:{port}")
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
# The box is measured only once the fonts are loaded and two frames have laid the block out: a box
# read earlier can be 0 wide ("Cannot take screenshot with 0 width"). Retry until it has a size.
# Each wait is bounded inside the page: a window that is not painted never fires a frame, and an
# unbounded wait read as a socket timeout (the capture failed one run in two).
MEASURE = (
    "(async()=>{const within=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);"
    "await within(document.fonts.ready,5000);"
    "await within(new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),2000);"
    f"const b={BLOCK}.getBoundingClientRect();return JSON.stringify({{x:b.x,y:b.y,width:b.width,height:b.height}})}})()"
)
box = None
for _attempt in range(10):
    candidate = json.loads(evaluate(MEASURE))
    if candidate["width"] > 0 and candidate["height"] > 0:
        box = candidate
        break
    # A zero box means the pane was not laid out: ask for the size and the scroll again.
    call("Emulation.setDeviceMetricsOverride", {"width": WIDTH, "height": max(900, height + 400), "deviceScaleFactor": 1, "mobile": False})
    evaluate(f"{BLOCK}?.scrollIntoView({{block:'start'}})")
    time.sleep(1)
if box is None:
    state = evaluate(
        f"JSON.stringify({{connected:{BLOCK}?.isConnected,visibility:document.visibilityState,"
        f"leaf:app.workspace.activeLeaf?.view?.getViewType?.(),blocks:document.querySelectorAll('.handbook-{game}-playbook').length,"
        f"window:[innerWidth,innerHeight]}})"
    )
    sys.exit(f"The .handbook-{game}-playbook block kept a zero-size box after 10 attempts: {state}")
image = call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True, "clip": {**box, "scale": 1}})
png = os.path.join(output_dir, f"handbook-{game}-{WIDTH}.png")
with open(png, "wb") as handle:
    handle.write(base64.b64decode(image["data"]))
with open(os.path.join(output_dir, f"handbook-{game}.html"), "w", encoding="utf-8") as handle:
    handle.write(evaluate(f"{BLOCK}.outerHTML"))
print(f"{game}: {png} ({int(box['width'])}x{int(box['height'])})")


def fail(message):
    sys.exit(f"PDF export of the {game} playbook: {message}")


def run_tool(name, *arguments):
    path = shutil.which(name)
    if not path:
        fail(f"{name} (poppler) is required to read the PDF and was not found")
    done = subprocess.run([path, *arguments], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if done.returncode != 0:
        fail(f"{name} failed: {done.stderr.strip()[:300]}")
    return done.stdout


if export_pdf:
    suffix = "" if printer_friendly else "-printer-friendly-off"
    # Obsidian prints from `document.body`: the rendered note goes into a `.print` child, the theme
    # becomes light, and the print media rules apply. The vault is dark so the paper must be forced.
    evaluate(
        """(()=>{
          const view=document.querySelector('.workspace-leaf.mod-active .markdown-preview-view')||document.querySelector('.markdown-preview-view');
          const print=document.createElement('div');print.className='print';
          const copy=view.cloneNode(true);copy.removeAttribute('style');print.appendChild(copy);
          globalThis.__handbookPrintBackup=document.body.className;
          document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');
          document.body.appendChild(print);return 1})()"""
    )
    call("Emulation.clearDeviceMetricsOverride")
    call("Emulation.setEmulatedMedia", {"media": "print"})
    time.sleep(2)
    probe = json.loads(
        evaluate(
            f"""(()=>{{
              const paper=getComputedStyle(document.documentElement).backgroundColor;
              const body=getComputedStyle(document.body).backgroundColor;
              const view=getComputedStyle(document.querySelector('.print .markdown-preview-view')).backgroundColor;
              const root=document.querySelector('.print .handbook-{game}-playbook');
              const style=root&&getComputedStyle(root);
              const tracks=style?style.gridTemplateColumns.split(' ').filter(Boolean).length:0;
              return JSON.stringify({{paper,body,view,hasBlock:Boolean(root),display:style?.display,tracks,
                friendly:document.body.classList.contains('brumes--printer-friendly'),colour:document.body.className.match(/brumes--colour-[a-z]+/)?.[0]||''}})}})()"""
        )
    )
    print(f"{game}: print probe {probe}")
    if not probe["hasBlock"]:
        fail("the .print container holds no playbook block")
    white = "rgb(255, 255, 255)"
    if printer_friendly:
        for key in ("paper", "body", "view"):
            if probe[key] != white:
                fail(f"printer-friendly paper is not white: {key} is {probe[key]}")
        if probe["display"] == "grid" and probe["tracks"] != 1:
            fail(f"the playbook prints on {probe['tracks']} columns, one expected")
        if probe["colour"] == "brumes--colour-dark":
            fail("the colour scheme stayed dark under .print")
    else:
        # Nothing is forced: the page keeps no white of its own and the class is gone.
        if probe["friendly"]:
            fail("the printer-friendly class is still set although the setting is off")
        if probe["paper"] == white:
            fail("the page background is forced to white although the printer-friendly export is off")
    # Put the window back as it was before the probe.
    call("Emulation.setEmulatedMedia", {"media": ""})
    evaluate("(()=>{document.querySelector('body > .print')?.remove();document.body.className=globalThis.__handbookPrintBackup;return 1})()")
    # The real export: the export dialog of the note is captured through the prototype of a live
    # modal (`require("obsidian")` only resolves inside plugins), and its `printToPdf()` writes the
    # file from Obsidian's hidden print window, without any native dialog.
    evaluate(
        """(()=>{
          let proto=Object.getPrototypeOf(app.setting),found=null;
          while(proto&&proto!==Object.prototype){const own=Object.getOwnPropertyNames(proto);
            if(own.includes('open')&&own.includes('onOpen')&&own.includes('onClose'))found=proto;proto=Object.getPrototypeOf(proto)}
          if(!found.__handbookPatched){const original=found.open;
            found.open=function(...args){if(typeof this.print==='function'&&typeof this.printToPdf==='function')globalThis.__handbookExport=this;return original.apply(this,args)};
            found.__handbookPatched=true}
          globalThis.__handbookExport=null;
          app.commands.executeCommandById('workspace:export-pdf');return 1})()"""
    )
    require("Boolean(globalThis.__handbookExport)", 15)
    pdf_path = os.path.join(output_dir, f"handbook-{game}{suffix}.pdf")
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    evaluate(
        "(async()=>{await globalThis.__handbookExport.printToPdf(%s);return true})()"
        % json.dumps({"includeName": False, "pageSize": "A4", "landscape": False, "marginsType": 0, "scaleFactor": 100, "scale": 1, "open": False, "filepath": pdf_path})
    )
    deadline = time.time() + 30
    while time.time() < deadline and not (os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0):
        time.sleep(0.3)
    if not os.path.exists(pdf_path):
        fail(f"printToPdf did not write {pdf_path}")
    evaluate("(()=>{globalThis.__handbookExport?.close?.();return true})()")

    fonts = run_tool("pdffonts", pdf_path)
    type3 = [line for line in fonts.splitlines() if " Type 3 " in line]
    if type3:
        fail("Type 3 fonts in the PDF (a printer refuses them): " + "; ".join(type3))
    pages = int(next(line.split()[1] for line in run_tool("pdfinfo", pdf_path).splitlines() if line.startswith("Pages:")))
    text = run_tool("pdftotext", "-layout", pdf_path, "-")
    # One text per page: no blank sheet, and the session notes (the back of the sheet) alone on the last one.
    page_texts = [run_tool("pdftotext", "-enc", "UTF-8", "-f", str(number), "-l", str(number), pdf_path, "-") for number in range(1, pages + 1)]
    if pages < 2:
        fail("the PDF has a single page: the sheet has a recto and a verso")
    for number, page_text in enumerate(page_texts, 1):
        if not page_text.strip():
            fail(f"page {number} is blank")
    notes_pages = [number for number, page_text in enumerate(page_texts, 1) if "Session 1" in page_text]
    if notes_pages != [pages]:
        fail(f"the session notes must be alone on the last page ({pages}), they are on {notes_pages}")
    if len(page_texts[-1].split()) > 60:
        fail("the verso carries more than the session notes: the recto flowed onto it")
    sheet = tempfile.mkdtemp(prefix="handbook-pdf-")
    run_tool("pdftoppm", "-r", "40", "-png", pdf_path, os.path.join(sheet, "page"))
    from PIL import Image

    for name in sorted(os.listdir(sheet)):
        with Image.open(os.path.join(sheet, name)).convert("RGB") as page:
            width, height = page.size
            border = [page.getpixel((x, y)) for x in (2, width // 2, width - 3) for y in (2, height // 2, height - 3) if not (x == width // 2 and y == height // 2)]
            if printer_friendly and any(sum(pixel) < 3 * 250 for pixel in border):
                fail(f"{name} does not have a white margin: {border}")
        print(f"{game}: {name} margin ok")
    shutil.rmtree(sheet, ignore_errors=True)
    print(f"{game}: {pdf_path} ({pages} page(s), {len(text.split())} words, no Type 3 font)")
    print(fonts)
