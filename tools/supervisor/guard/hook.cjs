/**
 * Supervisor guard, second interception path: preloaded by
 * `NODE_OPTIONS=--require <this file>` in every Node process a validation
 * starts.
 *
 * The PATH shims only see calls made through a shell. A Node tool that spawns
 * `gh` or `git` without one resolves the real `.exe` directly on Windows and
 * never meets a shim. This hook wraps the six child_process launchers: a call
 * the guard rules refuse is rewritten into a Node process that prints the
 * refusal and exits 97, so the real binary is never started and the caller
 * gets the same status and errors a refused shim would give.
 */
"use strict";

const marker = Symbol.for("supervisor.guard.hook");
if (!globalThis[marker]) {
	globalThis[marker] = true;
	install();
}

function install() {
	const childProcess = require("child_process");
	const { syncBuiltinESMExports } = require("module");
	const { win32 } = require("path");
	const { guardRefusal } = require("./rules.cjs");

	const toolOf = (file) => {
		const base = win32.basename(String(file)).toLowerCase().replace(/\.(exe|cmd|bat|com)$/, "");
		return base;
	};

	// Split a shell line into commands, then words; quotes kept together,
	// cmd's `^` escapes dropped.
	const commandsOf = (line) => {
		const commands = [[]];
		let word = null;
		let quote = null;
		const text = String(line).replace(/\^(.)/g, "$1");
		const end = () => {
			if (word !== null) commands[commands.length - 1].push(word);
			word = null;
		};
		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			if (quote) {
				if (char === "\\" && quote === '"' && text[i + 1] === '"') {
					word += '"';
					i++;
				} else if (char === quote) quote = null;
				else word += char;
			} else if (char === '"' || char === "'") {
				quote = char;
				word = word ?? "";
			} else if (/\s/.test(char)) end();
			else if ("&|;()\n".includes(char)) {
				end();
				commands.push([]);
			} else word = (word ?? "") + char;
		}
		end();
		return commands.filter((words) => words.length > 0);
	};

	const refusalOfWords = (words) => {
		let start = 0;
		while (start < words.length && (/^\w+=/.test(words[start]) || ["exec", "command", "env", "call"].includes(words[start]))) {
			start++;
		}
		const [file, ...args] = words.slice(start);
		return file === undefined ? null : refusalOf(file, args, false);
	};

	const refusalOfLine = (line) => {
		for (const words of commandsOf(line)) {
			const refused = refusalOfWords(words);
			if (refused) return refused;
		}
		return null;
	};

	function refusalOf(file, args, shell) {
		if (shell) return refusalOfLine([file, ...args].join(" "));
		const tool = toolOf(file);
		if (tool === "gh" || tool === "git") return guardRefusal(tool, args.map(String));
		// An explicit shell: cmd.exe /d /s /c "<line>", sh -c "<line>".
		if (tool === "cmd") {
			const at = args.findIndex((argument) => /^\/[ck]$/i.test(String(argument)));
			if (at < 0) return null;
			// cmd strips the first and the last quote of a line that starts with
			// one (always under /s): `""C:\bin\gh.cmd" release create"`. Both
			// readings are checked, so a quoted absolute path cannot hide gh.
			const line = args.slice(at + 1).join(" ");
			const stripped = /^\s*"/.test(line) ? line.replace(/^\s*"/, "").replace(/"(?=[^"]*$)/, "") : line;
			return refusalOfLine(line) ?? refusalOfLine(stripped);
		}
		if (["sh", "bash", "dash", "zsh"].includes(tool)) {
			const at = args.findIndex((argument) => /^-[a-z]*c[a-z]*$/.test(String(argument)));
			if (at >= 0 && args[at + 1] !== undefined) return refusalOfLine(String(args[at + 1]));
		}
		return null;
	}

	// The refused call is replaced by this process: nothing real starts.
	const refusedCommand = (message) => [
		process.execPath,
		["-e", `process.stderr.write(${JSON.stringify(`${message}\n`)});process.exit(97)`],
	];
	const withoutShell = (options) => {
		if (!options || typeof options !== "object") return options;
		const copy = { ...options };
		// The replacement is a plain node call: neither a shell nor the verbatim
		// quoting a cmd line needed may reach its arguments.
		delete copy.shell;
		delete copy.windowsVerbatimArguments;
		return copy;
	};

	// spawn(file, args?, options?), spawnSync, execFile(file, args?, options?, cb?), execFileSync.
	const wrapFile = (name) => {
		const original = childProcess[name];
		childProcess[name] = function guarded(file, ...rest) {
			const args = Array.isArray(rest[0]) ? rest[0] : [];
			const tail = Array.isArray(rest[0]) ? rest.slice(1) : rest;
			const options = tail.find((value) => value && typeof value === "object");
			const refused = refusalOf(file, args, Boolean(options && options.shell));
			if (!refused) return original.call(this, file, ...rest);
			const [node, script] = refusedCommand(refused);
			return original.call(this, node, script, ...tail.map((value) => (value === options ? withoutShell(value) : value)));
		};
	};

	// exec(command, options?, cb?), execSync: always a shell line.
	const wrapLine = (name, fileName) => {
		const original = childProcess[name];
		const fileLauncher = childProcess[fileName];
		childProcess[name] = function guarded(command, ...rest) {
			const refused = refusalOfLine(command);
			if (!refused) return original.call(this, command, ...rest);
			const [node, script] = refusedCommand(refused);
			return fileLauncher.call(this, node, script, ...rest.map(withoutShell));
		};
	};

	wrapLine("exec", "execFile");
	wrapLine("execSync", "execFileSync");
	for (const name of ["spawn", "spawnSync", "execFile", "execFileSync"]) wrapFile(name);
	syncBuiltinESMExports();
}
