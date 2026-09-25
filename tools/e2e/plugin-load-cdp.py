#!/usr/bin/env python3
"""Prove Handbook's initial activation in one isolated Obsidian vault."""

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.request

import websocket


PLUGIN_ID = "obsidian-handbook"
ASSETS = ("main.js", "manifest.json", "styles.css")


def final_status(initially_loaded, diagnostic_loaded):
    """A diagnostic retry can explain a failure, never erase it."""
    del diagnostic_loaded
    return "passed" if initially_loaded else "failed"


def normalized_error(value):
    if not isinstance(value, dict):
        return {"name": "Error", "message": str(value), "stack": None}
    return {
        "name": str(value.get("name") or "Error"),
        "message": str(value.get("message") or "unknown plugin-load failure"),
        "stack": value.get("stack") if isinstance(value.get("stack"), str) else None,
    }


def self_test():
    assert final_status(True, False) == "passed"
    assert final_status(False, True) == "failed"
    assert final_status(False, False) == "failed"
    error = normalized_error({"name": "TypeError", "message": "Invalid URL", "stack": "at plugin"})
    assert error == {"name": "TypeError", "message": "Invalid URL", "stack": "at plugin"}
    assert normalized_error("boom")["message"] == "boom"
    assert observed_version({"appVersion": "1.13.7", "userAgent": "ignored"}) == "1.13.7"
    assert observed_version({"appVersion": None, "userAgent": "obsidian/1.13.7 Electron/43"}) == "1.13.7"
    assert observed_version({"appVersion": None, "userAgent": "Electron/43"}) is None
    assert trust_is_ready({"communityPluginsEnabled": False, "dialogPresent": False}) is False
    assert trust_is_ready({"communityPluginsEnabled": False, "dialogPresent": True}) is True
    assert trust_is_ready({"communityPluginsEnabled": True, "dialogPresent": False}) is True
    print("plugin-load CDP self-test passed")


def parse_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--port", type=int)
    parser.add_argument("--output")
    parser.add_argument("--vault")
    parser.add_argument("--plugin")
    parser.add_argument("--expected-version", default="1.13.7")
    arguments = parser.parse_args()
    if not arguments.self_test:
        for name in ("port", "output", "vault", "plugin"):
            if getattr(arguments, name) is None:
                parser.error(f"--{name} is required")
    return arguments


class Cdp:
    def __init__(self, socket):
        self.socket = socket
        self.request_id = 0

    def call(self, method, params=None):
        self.request_id += 1
        current_id = self.request_id
        self.socket.send(json.dumps({"id": current_id, "method": method, "params": params or {}}))
        while True:
            payload = json.loads(self.socket.recv())
            if payload.get("id") != current_id:
                continue
            if "error" in payload:
                raise RuntimeError(payload["error"])
            return payload.get("result", {})

    def evaluate(self, expression):
        result = self.call(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True, "awaitPromise": True},
        )
        if "exceptionDetails" in result:
            details = result["exceptionDetails"]
            exception = details.get("exception", {})
            raise RuntimeError(exception.get("description") or details.get("text", "evaluation failed"))
        return result.get("result", {}).get("value")


def page_targets(port):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1) as response:
        return [target for target in json.load(response) if target.get("type") == "page"]


def connect(target, port, timeout=10):
    return websocket.create_connection(
        target["webSocketDebuggerUrl"], timeout=timeout, origin=f"http://127.0.0.1:{port}"
    )


def wait_for_vault_target(port, expected_root):
    deadline = time.time() + 45
    while time.time() < deadline:
        try:
            for target in page_targets(port):
                socket = connect(target, port, timeout=2)
                try:
                    root = Cdp(socket).evaluate("globalThis.app?.vault?.adapter?.getBasePath()")
                    if root and os.path.normcase(os.path.abspath(root)) == expected_root:
                        return target
                finally:
                    socket.close()
        except Exception:
            pass
        time.sleep(0.2)
    raise RuntimeError(f"CDP page for temporary vault {expected_root} did not appear")


def wait_until(cdp, expression, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if cdp.evaluate(expression):
            return True
        time.sleep(0.2)
    return False


def trust_is_ready(state):
    return bool(
        isinstance(state, dict)
        and (state.get("communityPluginsEnabled") or state.get("dialogPresent"))
    )


def trust_state(cdp):
    return cdp.evaluate(
        """(() => {
          const dialog = document.querySelector('.mod-trust-folder');
          const buttons = [...(dialog?.querySelectorAll('button') || [])];
          return {
            communityPluginsEnabled: Boolean(app.plugins?.isEnabled?.()),
            dialogPresent: Boolean(dialog),
            buttonCount: buttons.length,
            buttonLabels: buttons.map((button) => button.textContent?.trim() || '')
          };
        })()"""
    )


def establish_trust(cdp, timeout=30):
    deadline = time.time() + timeout
    state = None
    while time.time() < deadline:
        state = trust_state(cdp)
        if trust_is_ready(state):
            break
        time.sleep(0.2)
    if not trust_is_ready(state):
        raise RuntimeError(
            "Obsidian trust UI did not become actionable: "
            + json.dumps({"trust": state, "plugins": plugin_state(cdp)}, ensure_ascii=False)
        )
    if state.get("communityPluginsEnabled") and not state.get("dialogPresent"):
        return {"outcome": "already-enabled", **state}
    clicked = cdp.evaluate(
        """(() => {
          const trust = document.querySelector('.mod-trust-folder');
          const button = [...(trust?.querySelectorAll('button') || [])].pop();
          if (!button) return false;
          button.click();
          return true;
        })()"""
    )
    if not clicked:
        raise RuntimeError(
            "Obsidian trust dialog had no actionable button: "
            + json.dumps({"trust": state, "plugins": plugin_state(cdp)}, ensure_ascii=False)
        )
    if not wait_until(
        cdp,
        "Boolean(app.plugins?.isEnabled?.()) && !document.querySelector('.mod-trust-folder')",
        timeout=timeout,
    ):
        raise RuntimeError(
            "Obsidian trust did not settle after the prompt was accepted: "
            + json.dumps(
                {"trust": trust_state(cdp), "plugins": plugin_state(cdp)}, ensure_ascii=False
            )
        )
    return {"outcome": "accepted", **trust_state(cdp)}


def runtime_identity(cdp):
    return cdp.evaluate(
        """(() => {
          let electronVersion = null;
          try { electronVersion = globalThis.require?.('electron')?.remote?.app?.getVersion?.() || null; } catch (_) {}
          return {
            appVersion: globalThis.app?.version || globalThis.appVersion || electronVersion,
            userAgent: navigator.userAgent
          };
        })()"""
    )


def observed_version(identity):
    direct = identity.get("appVersion") if isinstance(identity, dict) else None
    if isinstance(direct, str) and re.fullmatch(r"\d+\.\d+\.\d+", direct):
        return direct
    user_agent = identity.get("userAgent", "") if isinstance(identity, dict) else ""
    match = re.search(r"(?:Obsidian|obsidian)/(\d+\.\d+\.\d+)", user_agent)
    return match.group(1) if match else None


def asset_hashes(plugin_root):
    hashes = {}
    for asset in ASSETS:
        with open(os.path.join(plugin_root, asset), "rb") as source:
            hashes[asset] = hashlib.sha256(source.read()).hexdigest()
    return hashes


def plugin_state(cdp):
    return cdp.evaluate(
        """(() => ({
          enabled: [...(app.plugins?.enabledPlugins || [])],
          loaded: Object.keys(app.plugins?.plugins || {}),
          initialLoaded: Boolean(app.plugins?.plugins?.['obsidian-handbook'])
        }))()"""
    )


def diagnostic_load(cdp):
    return cdp.evaluate(
        """(async () => {
          try {
            await app.plugins.loadPlugin('obsidian-handbook');
            return { resolved: true, loadedAfter: Boolean(app.plugins.plugins['obsidian-handbook']), error: null };
          } catch (error) {
            return {
              resolved: false,
              loadedAfter: Boolean(app.plugins.plugins['obsidian-handbook']),
              error: { name: error?.name, message: error?.message, stack: error?.stack }
            };
          }
        })()"""
    )


def write_report(path, report):
    temporary = f"{path}.{os.getpid()}.tmp"
    with open(temporary, "w", encoding="utf-8") as output:
        json.dump(report, output, ensure_ascii=False, indent=2)
        output.write("\n")
    os.replace(temporary, path)


def run(arguments):
    output_root = os.path.abspath(arguments.output)
    expected_root = os.path.normcase(os.path.abspath(arguments.vault))
    plugin_root = os.path.abspath(arguments.plugin)
    report_path = os.path.join(output_root, "REPORT.json")
    with open(os.path.join(plugin_root, "manifest.json"), encoding="utf-8") as source:
        manifest = json.load(source)
    report = {
        "status": "failed",
        "expectedObsidianVersion": arguments.expected_version,
        "observedObsidianVersion": None,
        "runtimeIdentity": None,
        "plugin": {"id": manifest.get("id"), "manifestVersion": manifest.get("version")},
        "assets": asset_hashes(plugin_root),
        "trust": None,
        "initial": None,
        "diagnostic": None,
    }
    socket = None
    try:
        target = wait_for_vault_target(arguments.port, expected_root)
        socket = connect(target, arguments.port)
        cdp = Cdp(socket)
        identity = runtime_identity(cdp)
        version = observed_version(identity)
        report["runtimeIdentity"] = identity
        report["observedObsidianVersion"] = version
        if version != arguments.expected_version:
            raise RuntimeError(
                f"Obsidian runtime identity must be {arguments.expected_version}, observed {version!r}: {identity}"
            )
        if not wait_until(cdp, "Boolean(globalThis.app?.plugins && globalThis.app?.vault)"):
            raise RuntimeError("Obsidian renderer did not expose vault and plugin APIs")
        report["trust"] = establish_trust(cdp)
        initially_loaded = wait_until(
            cdp, "Boolean(app.plugins.plugins['obsidian-handbook'])", timeout=20
        )
        initial = plugin_state(cdp)
        initial["initialLoaded"] = initially_loaded
        report["initial"] = initial
        if initially_loaded:
            report["status"] = "passed"
            print(json.dumps({"status": "passed", "plugin": PLUGIN_ID, "version": version}))
            return 0
        diagnostic = diagnostic_load(cdp)
        if diagnostic.get("error") is not None:
            diagnostic["error"] = normalized_error(diagnostic["error"])
        report["diagnostic"] = diagnostic
        report["status"] = final_status(False, diagnostic.get("loadedAfter", False))
        error = diagnostic.get("error") or {
            "name": "PluginLoadError",
            "message": "initial activation missed its deadline; diagnostic load returned without an exception",
            "stack": None,
        }
        print(f"{error['name']}: {error['message']}", file=sys.stderr)
        if error.get("stack"):
            print(error["stack"], file=sys.stderr)
        return 1
    except Exception as error:
        report["failure"] = normalized_error(
            {"name": type(error).__name__, "message": str(error), "stack": None}
        )
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1
    finally:
        write_report(report_path, report)
        if socket is not None:
            socket.close()


if __name__ == "__main__":
    args = parse_arguments()
    if args.self_test:
        self_test()
        sys.exit(0)
    sys.exit(run(args))
