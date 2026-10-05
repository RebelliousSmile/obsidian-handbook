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
        details = result["exceptionDetails"]
        raise RuntimeError(details.get("exception", {}).get("description") or details.get("text", "evaluation failed"))
    return result.get("result", {}).get("value")


def wait_for(expression, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if evaluate(expression):
            return
        time.sleep(0.2)
    diagnostic = evaluate("JSON.stringify({enabled: [...(app.plugins?.enabledPlugins || [])], loaded: Object.keys(app.plugins?.plugins || {}), isEnabled: app.plugins?.isEnabled?.(), mode: app.workspace.getMostRecentLeaf()?.view?.getMode?.(), activeFile: app.workspace.getMostRecentLeaf()?.view?.file?.path, preview: document.querySelector('.markdown-preview-sizer')?.innerText.slice(0, 500), sections: [...document.querySelectorAll('.markdown-preview-section')].slice(0, 3).map(section => ({className: section.className, children: [...section.children].map(child => [child.className, child.innerText?.slice(0, 60)]), html: section.innerHTML.slice(0, 400)})), modal: document.querySelector('.modal-container')?.innerText.slice(0, 1000), buttons: [...document.querySelectorAll('.modal-container button')].map(button => button.innerText), files: app.vault.getFiles().map(file => file.path).slice(0, 10)})")
    raise RuntimeError(f"Timed out waiting for: {expression}; state: {diagnostic}")


def screenshot(filename):
    image = call("Page.captureScreenshot", {"format": "png"})
    with open(os.path.join(output_dir, filename), "wb") as output:
        output.write(base64.b64decode(image["data"]))


def set_width(width, height=800):
    try:
        window = call("Browser.getWindowForTarget", {"targetId": target["id"]})
        call(
            "Browser.setWindowBounds",
            {"windowId": window["windowId"], "bounds": {"width": width, "height": height}},
        )
    except RuntimeError as error:
        if "wasn't found" not in str(error):
            raise
    # The Xvfb display caps the OS window height. Override the renderer's
    # viewport too, so virtualized Markdown sees every section of the probe.
    call(
        "Emulation.setDeviceMetricsOverride",
        {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False},
    )
    time.sleep(0.5)


# `require("obsidian")` only resolves inside plugins, so reach the shared classes
# through live instances: app.setting is a Modal, the Handbook plugin a Component.
MODAL_PROTO = """(() => {
  let proto = Object.getPrototypeOf(app.setting);
  let found = null;
  while (proto && proto !== Object.prototype) {
    const own = Object.getOwnPropertyNames(proto);
    if (own.includes('open') && own.includes('onOpen') && own.includes('onClose')) found = proto;
    proto = Object.getPrototypeOf(proto);
  }
  return found;
})()"""
COMPONENT_CLASS = """(() => {
  let proto = Object.getPrototypeOf(app.plugins.plugins['obsidian-handbook']);
  let found = null;
  while (proto && proto !== Object.prototype) {
    const own = Object.getOwnPropertyNames(proto);
    if (own.includes('addChild') && own.includes('registerEvent') && own.includes('load')) found = proto;
    proto = Object.getPrototypeOf(proto);
  }
  return found.constructor;
})()"""
PRINT_PROBE = "layout-regions-print-probe.md"
PRINT_FLAT = "layout-regions-print-flat.md"
PRINT_SINGLE = "layout-regions-print-single.md"
TITLES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]


def install_export_hook():
    evaluate(
        """
        (() => {
          const proto = %s;
          if (typeof proto.open !== 'function' || typeof proto.onOpen !== 'function') throw new Error('Modal prototype not reachable');
          if (!proto.__handbookPatched) {
            const original = proto.open;
            proto.open = function (...args) {
              if (typeof this.print === 'function' && typeof this.printToPdf === 'function') {
                globalThis.__handbookExport = this;
              }
              return original.apply(this, args);
            };
            proto.__handbookPatched = true;
          }
          return true;
        })()
        """
        % MODAL_PROTO
    )


def create_print_notes():
    """The flat and single-column notes are variants of the probe, written into the disposable vault."""
    evaluate(
        """
        (async () => {
          const probe = await app.vault.adapter.read('%s');
          const withoutMarkers = probe.split('\\n').filter(line => !line.startsWith('<!-- handbook-layout') && !line.startsWith('<!-- /handbook-layout')).join('\\n');
          const single = probe.replace('columns=3', 'columns=1');
          for (const [path, text] of [['%s', withoutMarkers], ['%s', single]]) {
            if (!app.vault.getAbstractFileByPath(path)) await app.vault.create(path, text);
          }
          return true;
        })()
        """
        % (PRINT_PROBE, PRINT_FLAT, PRINT_SINGLE)
    )
    for path in (PRINT_PROBE, PRINT_FLAT, PRINT_SINGLE):
        wait_for(
            "(app.metadataCache.getFileCache(app.vault.getAbstractFileByPath('%s'))?.sections || []).length > 5" % path
        )


def open_export(path):
    """Opens the export dialog for a note and keeps its instance; nothing native is reached."""
    evaluate("globalThis.__handbookExport = null; true")
    evaluate(
        "(async () => { await app.workspace.getLeaf(false).openFile(app.vault.getAbstractFileByPath('%s')); return true; })()"
        % path
    )
    wait_for("app.workspace.getMostRecentLeaf()?.view?.file?.path === '%s'" % path)
    evaluate("app.commands.executeCommandById('workspace:export-pdf')")
    wait_for("Boolean(globalThis.__handbookExport)", timeout=10)


def capture_print(include_name, width=None):
    """Runs Obsidian's own print() on a detached .print container and describes it."""
    return json.loads(
        evaluate(
            f"""
            (async () => {{
              const Component = {COMPONENT_CLASS};
              const instance = globalThis.__handbookExport;
              const host = document.createElement('div');
              host.className = 'print';
              if ({json.dumps(width)} !== null) host.style.width = {json.dumps(width)} + 'px';
              document.body.appendChild(host);
              try {{
                await instance.print(host, new Component(), {json.dumps(include_name)});
                const view = host.querySelector(':scope > .markdown-preview-view');
                const top = [...(view ? view.children : host.children)];
                const flowing = view ? [...view.querySelectorAll(':scope > .handbook-layout-flow')] : [];
                return JSON.stringify({{
                  hostClasses: host.className,
                  viewClasses: view ? view.className : null,
                  directTitle: view ? [...host.children].map(child => child.tagName + '.' + child.className) : null,
                  children: top.map(child => ({{
                    tag: child.tagName,
                    classes: child.className,
                    firstChild: child.firstElementChild ? child.firstElementChild.tagName + '.' + child.firstElementChild.className : null,
                    childCount: child.children.length,
                    text: (child.textContent || '').trim().slice(0, 48)
                  }})),
                  flow: {{
                    host: Boolean(view && view.classList.contains('handbook-layout-flowing')),
                    variable: view ? view.style.getPropertyValue('--handbook-layout-columns') : '',
                    blocks: flowing.length,
                    tracks: new Set(flowing.map(block => Math.round(block.getBoundingClientRect().left))).size,
                    titles: flowing.reduce((titles, block) => titles.concat([...block.querySelectorAll('h2')].map(heading => heading.textContent)), []),
                    wrappers: host.querySelectorAll('.handbook-layout-region').length
                  }},
                  html: host.innerHTML
                }});
              }} finally {{
                host.remove();
              }}
            }})()
            """
        )
    )


def print_pdf(pdf_path):
    """The real export: the hidden print window writes the PDF; no native dialog is involved."""
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    evaluate(
        """
        (async () => {
          await globalThis.__handbookExport.printToPdf(%s);
          return true;
        })()
        """
        % json.dumps(
            {
                "includeName": False,
                "pageSize": "A4",
                "landscape": False,
                "marginsType": 0,
                "scaleFactor": 100,
                "scale": 1,
                "open": False,
                "filepath": pdf_path,
            }
        )
    )
    deadline = time.time() + 30
    while time.time() < deadline and not (os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0):
        time.sleep(0.3)
    if not os.path.exists(pdf_path):
        raise RuntimeError(f"printToPdf did not write {pdf_path}")
    evaluate("(() => { globalThis.__handbookExport?.close?.(); return true; })()")


def title_positions(pdf_path):
    """Where each region title sits on the page, read from the PDF and not from the DOM."""
    try:
        from pypdf import PdfReader
    except ImportError as error:
        raise RuntimeError("Python package pypdf is required to measure the exported PDF.") from error
    found = {}

    def visit(text, cm, tm, _font, _size):
        title = text.strip()
        if title in TITLES and title not in found:
            x = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
            y = tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
            found[title] = (round(x), round(y))

    for page in PdfReader(pdf_path).pages:
        page.extract_text(visitor_text=visit)
    missing = [title for title in TITLES if title not in found]
    if missing:
        raise RuntimeError(f"Titles missing from {pdf_path}: {missing}")
    return found


def bare_structure(capture):
    """Every top-level block stays a wrapper, a rule or the frontmatter: nothing was regrouped."""
    return all(
        child["tag"] in ("HR", "H1") or child["classes"] in ("", "handbook-layout-flow", "mod-frontmatter mod-ui")
        for child in capture["children"]
    )


def probe_print_dom():
    # The detached print container takes the width of the window.
    set_width(1200)
    install_export_hook()
    wait_for("Boolean(app.vault.getAbstractFileByPath('%s'))" % PRINT_PROBE)
    create_print_notes()

    open_export(PRINT_PROBE)
    facts = json.loads(
        evaluate(
            """
            JSON.stringify({
              userAgent: navigator.userAgent,
              obsidianVersion: (() => { try { return require('electron').ipcRenderer.sendSync('version'); } catch (error) { return String(error); } })(),
              sections: (app.metadataCache.getFileCache(app.workspace.getActiveFile())?.sections || [])
                .map(section => ({ type: section.type, start: section.position.start.line, end: section.position.end.line }))
            })
            """
        )
    )
    without_title = capture_print(False)
    with_title = capture_print(True)
    narrow = capture_print(False, 480)
    themed = {}
    for game_class in ("brumes--adrenaline", "brumes--monsterhearts"):
        evaluate("document.body.classList.add('%s')" % game_class)
        themed[game_class] = capture_print(False)
        evaluate("document.body.classList.remove('%s')" % game_class)
    pdf_path = os.path.join(output_dir, "layout-regions-print-probe.pdf")
    print_pdf(pdf_path)

    for label, capture in (("without title", without_title), ("with title", with_title), *themed.items()):
        flow = capture["flow"]
        if not flow["host"] or flow["variable"] != "3" or flow["blocks"] != 12 or flow["tracks"] != 3 or flow["wrappers"] != 0:
            raise RuntimeError(f"The print DOM ({label}) did not flow the three-column region: {flow}")
        if flow["titles"] != TITLES:
            raise RuntimeError(f"The print DOM ({label}) lost or reordered sections: {flow['titles']}")
        if not bare_structure(capture):
            raise RuntimeError(f"The print DOM ({label}) was regrouped: {capture['children']}")
    if not 1 <= narrow["flow"]["tracks"] < 3:
        raise RuntimeError(f"A narrow printable width must drop columns: {narrow['flow']}")
    if with_title["directTitle"] is None or with_title["children"][0]["tag"] != "H1":
        raise RuntimeError("includeName no longer prints a direct title heading; the join assumptions changed.")

    positions = title_positions(pdf_path)
    columns = sorted({x for x, _ in positions.values()})
    rows = sorted({y for _, y in positions.values()})
    abscissas = [positions[title][0] for title in TITLES]
    if len(columns) != 3 or abscissas != sorted(abscissas):
        raise RuntimeError(f"The PDF must flow six titles down three columns, in order: {positions}")
    if len(rows) < 2:
        raise RuntimeError(f"The PDF columns must hold more than one title: {positions}")

    # Control: the same note without any region keeps its native DOM and prints on one abscissa.
    open_export(PRINT_FLAT)
    flat = capture_print(False)
    flat_pdf = os.path.join(output_dir, "layout-regions-print-flat.pdf")
    print_pdf(flat_pdf)
    flat_positions = title_positions(flat_pdf)
    if flat["flow"]["host"] or flat["flow"]["blocks"] or not bare_structure(flat):
        raise RuntimeError(f"A note without region must print untouched: {flat['flow']}")
    if len({x for x, _ in flat_positions.values()}) != 1:
        raise RuntimeError(f"The control PDF must keep a single column: {flat_positions}")

    open_export(PRINT_SINGLE)
    single = capture_print(False)
    evaluate("(() => { globalThis.__handbookExport?.close?.(); return true; })()")
    if single["flow"]["host"] or single["flow"]["blocks"] or not bare_structure(single):
        raise RuntimeError(f"A columns=1 region must print as a single column: {single['flow']}")

    capture = {
        "facts": facts,
        "withoutTitle": without_title,
        "withTitle": with_title,
        "narrow": narrow,
        "flat": flat,
        "single": single,
        "pdf": pdf_path,
        "pdfTitles": positions,
        "flatPdfTitles": flat_positions,
    }
    with open(os.path.join(output_dir, "print-dom.json"), "w", encoding="utf-8") as output:
        json.dump(capture, output, ensure_ascii=False, indent=2)
    return capture


wait_for("Boolean(globalThis.app?.vault && globalThis.app?.workspace)")
wait_for("Boolean(app.vault.getAbstractFileByPath('layout-regions-probe.md'))")
# Obsidian asks whether to trust a first-time vault that already has plugins.
# This vault and its only plugin were created by the journey itself.
wait_for("""
    (() => {
      const trustModal = document.querySelector('.mod-trust-folder');
      // The trust choice is the last button in every UI language.
      const trustButton = [...(trustModal?.querySelectorAll('button') || [])].pop();
      trustButton?.click();
      return app.plugins.isEnabled() && !document.querySelector('.mod-trust-folder');
    })()
    """)
wait_for("Boolean(app.plugins.plugins['obsidian-handbook'])")
if os.environ.get("HANDBOOK_E2E_LOAD_ONLY") == "1":
    print(json.dumps({"plugin": "obsidian-handbook", "loaded": True}))
    ws.close()
    sys.exit(0)
# A fresh vault has no game installed, so Handbook offers a starter kit. Let it
# appear, then dismiss it: an open modal swallows the preview toggle below.
time.sleep(2)
wait_for("(() => { document.querySelectorAll('.modal-container .modal-header-button, .modal-container .modal-close-button').forEach(button => button.click()); return !document.querySelector('.modal-container'); })()")
if os.environ.get("HANDBOOK_E2E_PRINT_ONLY") == "1":
    # The print capture does not depend on the reading-view assertions below.
    only = probe_print_dom()
    print(json.dumps({"print": {"children": len(only["withoutTitle"]["children"]), "pdf": only["pdf"]}}))
    sys.exit(0)
FLOW = """JSON.stringify((() => {
  const sizer = document.querySelector('.markdown-preview-sizer');
  const blocks = [...sizer.querySelectorAll(':scope > .handbook-layout-flow')].filter(block => block.getBoundingClientRect().height > 0);
  return {
    flowing: sizer.classList.contains('handbook-layout-flowing'),
    variable: sizer.style.getPropertyValue('--handbook-layout-columns'),
    columnCount: getComputedStyle(sizer).columnCount,
    tracks: new Set(blocks.map(block => Math.round(block.getBoundingClientRect().left))).size,
    callouts: sizer.querySelectorAll(':scope > .handbook-layout-flow .callout').length,
    tableFlows: Boolean(sizer.querySelector(':scope > .handbook-layout-flow table')),
    wrappers: document.querySelectorAll('.handbook-layout-region').length
  };
})())"""


def flow():
    return json.loads(evaluate(FLOW))


def wait_for_tracks(expected):
    try:
        wait_for("JSON.parse(%s).tracks === %d" % (FLOW, expected), timeout=10)
    except RuntimeError as error:
        raise RuntimeError(f"Expected {expected} column tracks: {flow()}") from error


set_width(1200)
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

# A flowing note keeps every section drawn: both regions are known at once.
wait_for("JSON.parse(%s).callouts === 6" % FLOW)
wait_for_tracks(3)
wide = flow()
if wide != {"flowing": True, "variable": "3", "columnCount": "3", "tracks": 3, "callouts": 6, "tableFlows": False, "wrappers": 0}:
    raise RuntimeError(f"Unexpected wide layout: {wide}")
screenshot("layout-regions-wide.png")

# A game theme can also flow the complete note into two editorial columns.
# A note with a region keeps the count its own region asks for.
game_classes = ["brumes--adrenaline", "brumes--urban-shadows", "brumes--monsterhearts"]
original_game_classes = json.loads(evaluate(
    "JSON.stringify([...document.body.classList].filter(name => name.startsWith('brumes--')))"
))
evaluate("document.body.classList.remove('brumes--adrenaline', 'brumes--urban-shadows', 'brumes--monsterhearts')")
evaluate("document.body.classList.add('brumes--adrenaline')")
adrenaline = flow()
if adrenaline["columnCount"] != "3" or adrenaline["tracks"] != 3:
    raise RuntimeError(f"Adrenaline theme changed the three-column flow: {adrenaline}")
evaluate("document.body.classList.remove('brumes--adrenaline')")
evaluate("document.body.classList.add('brumes--monsterhearts')")
evaluate("app.workspace.leftSplit.collapse()")
set_width(750)
wait_for_tracks(3)
game_layout = flow()
if game_layout["columnCount"] != "3" or game_layout["callouts"] != 6:
    raise RuntimeError(f"Game theme changed the three-column flow: {game_layout}")
screenshot("layout-regions-game-theme.png")
evaluate("document.body.classList.remove('brumes--monsterhearts')")
for game_class in original_game_classes:
    if game_class in game_classes:
        evaluate(f"document.body.classList.add('{game_class}')")
set_width(1200)

# Columns are never narrower than their minimum width: a narrow pane drops them one by one.
evaluate("document.querySelector('.markdown-preview-section').style.width = '500px'")
wait_for_tracks(2)
evaluate("document.querySelector('.markdown-preview-section').style.width = '320px'")
wait_for_tracks(1)
screenshot("layout-regions-narrow-pane.png")
evaluate("document.querySelector('.markdown-preview-section').style.removeProperty('width')")
wait_for_tracks(3)

set_width(600)
time.sleep(1)
narrow = flow()
if not narrow["flowing"] or narrow["tracks"] >= 3 or narrow["callouts"] != 6:
    raise RuntimeError(f"Unexpected narrow layout: {narrow}")
screenshot("layout-regions-narrow.png")


print_capture = probe_print_dom()

print(json.dumps({"adrenaline": adrenaline, "game": game_layout, "narrow": narrow, "print": {"children": len(print_capture["withoutTitle"]["children"]), "pdf": print_capture["pdf"]}, "screenshots": ["layout-regions-wide.png", "layout-regions-game-theme.png", "layout-regions-narrow-pane.png", "layout-regions-narrow.png"], "wide": wide}))
