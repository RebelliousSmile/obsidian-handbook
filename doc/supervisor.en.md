# Correction train supervisor

[Français](supervisor.fr.md) · **English**

`pnpm supervise` coordinates a correction that spans the five repositories: Handbook, Lantern and the three schema repositories (`schema-pbta`, `schema-adrenaline`, `schema-in-the-mist`). A set of changes published together is called a **train**.

The supervisor observes, records and tells who does what next. It authors no change: `commit` lands what a person prepared, as it stands, and nothing is published without a green presentation, bound to the commits it validated. Running `ship` is validating the change: the supervisor then does all the train work by itself, waiting for nobody. It lands the prepared change, presents it, writes the train files (pins, lockfiles, manifests, records), commits and pushes them, publishes the providers then the consumers, and closes the train. It only moves a checkout by fast-forwarding it to `origin/main`, and stops on a dirty or diverged checkout.

## Requirements

- The five repositories cloned side by side, under the names of the topology (`supervisor/topology.json`, `path` field): `obsidian-handbook`, `lantern`, `schema-pbta`, `schema-adrenaline`, `schema-in-the-mist`. `--root <dir>` names their parent directory (default: the parent of Handbook).
- `git`, and `gh` authenticated on `RebelliousSmile`.
- Node 20 or later, on Linux, macOS or native Windows. Neither a POSIX shell nor WSL is required.
- Only `link --create` without `--yes` needs a real terminal (Claude Code's `!` prefix is not one). No other command reads any input.
- The version and the `CHANGELOG` of a consumer (Lantern, Handbook) are prepared with the change. The supervisor writes neither: it publishes the version `package.json` carries on `origin/main`.
- On GitHub, the `release` environment of `schema-adrenaline` has no required reviewer. A run held by reviewers stops the train.

## The train record

Each train lives in `supervisor/trains/<id>.json`, in Handbook. It holds the linked issues and their dependencies, the presentation, the publications, the runs, the convergence, the consumer releases and the closing date. Its shape is described by `supervisor/train.schema.json`.

The **coordination issue**, opened in Handbook, is a projection of it: only the block between `<!-- supervisor:begin -->` and `<!-- supervisor:end -->` belongs to the supervisor. Whatever is written around it survives every `sync`.

## The cycle, command by command

The commands follow this order:

`status` → `open` / `link` → `next` → `ship`

`ship` alone chains `commit` → `present` → `publish` → `converge` → `release` → `close`. Each of these links remains a command, useful to look at one step or to resume by hand.

Common options: `--root <dir>`, `--topology <file>`, `--train <id>` (default: the only open train).

### 1. `status`: the state of the five repositories

```bash
pnpm supervise status [--json] [--strict] [--no-fetch]
```

Lists each repository, its branch, how far it is behind `origin/main`, the pins of each consumer on each provider (URL and lockfile SRI) and the active train. A pin on a release candidate is reported with its URL; two diverging pins are named with both URLs. `--strict` fails on the first gap. Changes nothing.

### 2. `open` and `link`: start the train

```bash
pnpm supervise open <id> --title "<title>"
pnpm supervise link <repo>#<n> [--depends-on a,b] [--evidence e]...
pnpm supervise link <repo> --create --title "<title>" [--yes]
pnpm supervise sync
```

`open` writes the record and creates the coordination issue. `link` attaches an existing issue, or creates one with `--create`. Creating asks for confirmation on the terminal; without a terminal, `--yes` is required. Every refusal happens before the first write, local or on GitHub: a repository already engaged by another open train, an edge to a repository the topology does not declare, a dependency cycle. `sync` rewrites the supervisor block of the coordination issue.

### 3. `next`: who can move

```bash
pnpm supervise next [--json]
```

Sorts each item into `done`, `ready` or `blocked`, recomputed from GitHub on every call. An item is `done` when its issue is closed **and** its closing commit is reachable from `origin/main`. A closed issue without that commit shows as `closed, not proven`. A merged provider unblocks its consumers.

**Human**: the corrections themselves, in each repository, in the order `next` gives.

**Landing the work**: `present` and `preview` accept only clean repositories on `origin/main`. For a provider and its consumers:

```bash
pnpm supervise commit schema-adrenaline
```

Each repository's message is prepared in its `.git/SUPERVISOR_COMMIT_MSG` (outside the checkout, so it never dirties it). Everything is checked before the first write: every repository on `main`, none behind `origin/main`, a message for each changed repository and no message without changes. The command shows the plan, commits the three repositories, then pushes them. It asks for no input: a refusal comes before the first commit. Handbook's train records are never part of it, and no release is published.

For one repository alone, whatever its role:

```bash
pnpm supervise commit lantern --only --message "feat(adrenaline-pj): print the Malus column"
```

`--only` runs the same checks on that repository alone and leaves the others as they are, changed or not. `--message` stands for the prepared file; both at once are refused.

**Running a train beside other work**: every command wants clean checkouts, so any work in progress (another plan, for instance) blocks the train. Worktrees lift that:

```bash
pnpm supervise worktree ../train [--repos a,b] [--no-install]
pnpm supervise commit schema-pbta --root ../train
```

`worktree <dir>` creates one linked worktree per repository under `<dir>/<path>`, detached at `origin/main` (git keeps `main` in a single checkout), then runs each one's frozen install, which the validations need (`--no-install` skips it). Every refusal comes before the first creation: a missing repository, a failed `fetch`, a target directory that already exists. After that, any command takes `--root <dir>` and works there, leaving the usual checkouts and their uncommitted work alone. The work of the train is prepared in those worktrees. In a linked worktree, `commit` and the supervisor's own writes accept a branch other than `main` or a detached head, and push `HEAD:main`; they still require being level with `origin/main`. The supervisor never removes a worktree: `git worktree remove <dir>` stays a human act.

**The supervisor does not change itself.** Every command but `status` refuses to run when its own code differs from `origin/main`: `tools/supervise.mjs`, `tools/supervisor/`, its harnesses (`tools/assert-supervisor.mjs`, `tools/supervisor*.harness.mts`, `tools/fixtures/supervisor/`), `supervisor/` outside the train records, and the `supervise` script of `package.json`. A change to the supervisor is committed and pushed by hand, by a person, before the supervisor acts again.

### 4. `ship`: validate, and publish everything

```bash
pnpm supervise ship --message "<commit message>"         # shows the whole cycle, writing nothing
pnpm supervise ship --message "<commit message>" --run   # from the commit to the closed train
```

Running `ship --run` is the validation: there is no other. The command chains the links described below, in order, and reads no input:

1. `commit` of every repository the train concerns (its items and their consumers). A changed repository gets the message prepared in its `.git/SUPERVISOR_COMMIT_MSG`, or failing that the one of `--message`; a repository without changes is left as it is;
2. `present`;
3. `publish --run`, then `converge --run`, `release --run` and `close --run`.

Each link keeps its own refusals. The first one that fails stops the chain, with its message and a non-zero exit code: a stop is always a named failure, never a wait. A red presentation therefore leaves the commits landed and publishes nothing.

Before the first commit, `ship` refuses a closed train, a repository engaged by another open train, a changed repository without a message, a repository behind `origin/main`, and supervisor code that differs from `origin/main`.

`ship --run` can be run again after a stop: it resumes where the train record stands. Nothing to commit skips the commit, a presentation that still holds is not replayed, and the following links do not redo what is already published. `--message` is then no longer needed.

Without `--run`, `ship` prints the commit plan and the steps that follow, and writes nothing: no commit, no train record, no dispatch.

### 5. `present`: the evidence, publishing nothing

```bash
pnpm supervise present
```

Requires clean checkouts at `origin/main`, a train whose items are all `done`, and no repository engaged elsewhere. For each concerned repository, it reports the SHA, the commits since the base and the diff summary, then runs its validations (`validations` in the topology) **behind the publication guard**: a validation that tries `gh release create`, a workflow dispatch, `git push` or `git tag` fails. The presentation ends with the list of publications it binds.

A green presentation binds each repository to the commit its validations ran on. After it, a repository may only receive the commits the train needs: they touch its `trainFiles` only, and every release URL or SRI they introduce belongs to an archive the train observed. The commits the supervisor lands itself (adoption, manifests, records) therefore keep the presentation valid; any other change outdates it and sends you back to `present`. This binding is checked again before every step of `publish`, `converge`, `release` and `close`. The fingerprint of the presentation protects against an accidental edit of the train record, not against a deliberate one.

The guard has a single rule table (`tools/supervisor/guard/rules.cjs`) and two interception paths, because neither is enough alone:

- **`PATH` shims** `gh` / `git` (in `sh`) and `gh.cmd` / `git.cmd` (for `cmd.exe`), put at the head of the validation's `PATH`: they stop any call made through a shell;
- a **`NODE_OPTIONS=--require` hook** (`hook.cjs`), inherited by every Node process: it stops a Node tool that starts `gh` or `git` without a shell, which on Windows finds `gh.exe` directly and skips the shims.

The guard fails closed: a refused call exits 97, a missing real binary exits 127, and neither reaches the binary.

**Try it before validating**: `pnpm supervise preview --vault <vault>` runs the train's code in Obsidian and in each consumer. The command first requires what `present` requires: every concerned repository must be on `origin/main` and clean. The change is therefore landed by `commit` before `preview`; `ship` then has nothing left to commit. It also warns about a SHA that moved since the presentation. Then:

- it builds the train's providers that have a `build` script;
- it builds Handbook against their checkouts: each declared package is redirected to its folder, following its `exports` map;
- it installs in the vault the packs each provider publishes through its `handbook.json`. The layout is the installer's (`.obsidian/handbook/sources/<id>/`), and `source.json` carries the checkout's HEAD;
- it deploys `dist/` next to `data.json`, which it reads and never writes, then opens the vault;
- it starts each consumer's vite server on those same checkouts, with its own config and aliases merged on top. Its `package.json` and lockfiles are not touched.

Nothing in it belongs to one game or one schema: what gets mounted is what each provider of the train publishes and what each consumer declares. `--no-serve` stops at the vault, `--no-open` opens nothing, `--port` sets the dev server port, and `Ctrl+C` stops the servers. To follow `schema-pbta` continuously, `pnpm dev:schema-pbta -- <vault>` (#65) copies its packs again on every change.

### 6. `publish`: from the first dispatch to convergence

```bash
pnpm supervise publish         # shows the next step and its exact command
pnpm supervise publish --run   # chains every step, up to convergence
```

Without `--run`, nothing runs, and two calls in a row say the same thing. With `--run`, `publish` runs a step, observes again, then runs the next one. It follows each run to its end, polling its status every 15 seconds and printing one line per change, and stops only on a failure or a human step. The presentation is checked again **before every step**. Providers go one after the other, in the dependency order of the train: the second starts once the final of the first is published. Once every final is published, `publish --run` chains `converge --run`. Each step is recomputed from what GitHub and the repositories show: a failed run is retried, a candidate already published is never published again. Before any dispatch, `publish` stops and names what is missing: a secret (for example `RELEASE_TOKEN` on `schema-pbta`) or an input the workflow does not declare. A final whose bytes differ from the candidate stops it too, naming both digests.

A step is one of these kinds:

- **automated**: run by `--run`. It is a `gh workflow run`, a local command, the consumers adopting the candidate, a train manifest to land on `main`, or the final tag to push;
- **human**: a state the supervisor does not repair by itself, for example a successful run that did not produce its release; inspect it before any new publication;
- **wait**: a run in progress, which `--run` follows to its end.

Adopting the candidate in Handbook and Lantern is automated. The supervisor rewrites `package.json` and every lockfile to the candidate URL and its SRI, then runs the frozen install (`pnpm install --frozen-lockfile`, or `npm ci`) and the consumer's validations, behind the guard. It then commits (`chore(deps): adopt <pkg> <tag>`) and pushes. A consumer that fails is named with the failing command: its pins are restored, and nothing of it is committed.

### 7. `converge`: every consumer on every final

```bash
pnpm supervise converge         # checks, writing nothing
pnpm supervise converge --run   # adopts the finals and lands the convergence files
```

Requires each provider of the train to have its final published, a presentation that holds and clean checkouts at `origin/main`. Without `--run`, each consumer still on a candidate is named, with the URL it pins and the final's URL. With `--run`, it adopts the final: these are the same bytes as the candidate already validated, so only the frozen install runs before the commit. It then updates the provider registry of a consumer that keeps one (the `matrix` field of the topology, Lantern's `release-train.matrix.json`): `handbook.ref` moves to Handbook's `origin/main`, which pins the finals, and each provider of the train to its `origin/main`, with its train manifest added (same commit as `validatorRef`). Not to the commit of the final tag: the one of `schema-pbta` names the provider commit, which precedes the manifest. The registry is a train file, so that commit keeps the presentation valid. Without `--run`, a stale registry is named and fails the convergence. Then, behind the guard:

- the consumers' `convergence` commands (topology): Handbook `assert:consumer-schema-pins --final`, Lantern `assert:consumer-schema-pins`, `assert:release-inputs` and `assert:release-train-matrix`;
- each provider's convergence step (see below).

The result is recorded in the `convergence` block of the record (status, date, SHA of each repository, checks, notes). A failing check, or a consumer without a convergence command, fails the convergence and names it.

### 8. `release`: the consumer releases

```bash
pnpm supervise release         # shows the next step and its exact command
pnpm supervise release --run   # tags and publishes each consumer, Handbook last
```

Requires a `passed` convergence, a presentation that holds and consumers still on every final, checked again before every step. For Lantern then Handbook, the supervisor reads the version of `package.json` on `origin/main`, pushes the tag `v<version>` (`git push origin origin/main:refs/tags/v<version>`), then starts the release the way the topology declares it (`release.trigger`): Lantern's workflow starts on the tag push, Handbook's is dispatched on the tag (`gh workflow run release.yml --ref v<version>`). It follows the run to its end and records the release in `consumerReleases`.

A release that exists is never published again, and a tag is never pushed twice nor deleted: the command can be run again at any time. A red run stops before the next consumer. A tag with neither a release nor a run, or a tag outside `main`, is named and left to a person.

### 9. `close`: close on evidence

```bash
pnpm supervise close           # shows what would be closed
pnpm supervise close --run     # closes
```

Requires a `passed` convergence, a presentation that holds, `origin/main` heads that **descend** from the convergence SHAs (the consumers' release commits land after it), no pin gap, and the Lantern and Handbook releases described above. Anything missing is named, and nothing is closed. With `--run`, `close` records `consumerReleases`, comments on or closes each issue, closes the coordination issue **last**, then marks the train `closed`.

## Automated, human, never inside a validation

| | What it covers |
| --- | --- |
| **Automated** | observing repositories and pins (`status`, `next`); validations and checks behind the guard (`present`, `converge`); once `ship --run` is started, all the train work: commit and push of the prepared change, presentation, dispatches, local promotions, Handbook and Lantern adopting the candidate then the final, train manifests and records, the final tag of `schema-adrenaline`, Lantern's provider registry, the convergence file of `schema-in-the-mist`, convergence; tag and release of Lantern then of Handbook; commenting on and closing issues |
| **Human** | the corrections, with the version and the `CHANGELOG` of the consumers; the validation, which is running `ship`; the supervisor's code, committed and pushed by hand; any deletion (branches, tags, files) |
| **Never inside a validation** | any release, workflow dispatch, `git push` or `git tag`, any write through `gh api`. The validations of `present` and the checks of `converge` run behind the guard, and each link checks the presentation again before every step |

A stop of the chain is not a planned gesture: it is a named failure (dirty or diverged checkout, red run, successful run without a result), to fix before running `ship --run` again.

## What the validation judges: design and behaviour

The validation covers **rendering and behaviour**: is the sheet or feature the one that was wanted? It is judged before `ship`, in the vault and in each consumer (`preview`). It does not cover the control machinery.

Everything technical moves on without asking: pack and version consistency, pins and SRI, release-train protocols, `pnpm check` / `npm run check` validations, provider CI. A red validation gets fixed, in the code or in the validation itself when the validation is what is wrong, then `ship --run` is run again. It is never bypassed: no validation disabled, no guard set aside. It is reported afterwards, in the `present` report.

What stays human: the corrections, the validation itself, the supervisor's code, and any deletion (branches, traces, files).

## The three providers

| | `schema-pbta` | `schema-adrenaline` | `schema-in-the-mist` |
| --- | --- | --- | --- |
| Candidate | `release.yml` with `mode=digest` (packs and computes the digest, no release), then `mode=stage` (publishes the candidate named by the manifest) | `publish-candidate.yml` | `release-candidate.yml` |
| Train manifest | `release-train/candidates/<pkg>-<tag>.json` then `release-train/<pkg>-<tag>.json`, landed by the supervisor | `release-train/<pkg>-<tag>.json`, landed by the supervisor | `release-trains/<tag>.json`, status `pending`, landed by the supervisor |
| Proof | `release-train.yml` | `release-train.yml` | `npm run release-train:assert` locally, which writes a provenance file |
| Final | `release.yml` with `mode=promote`, same bytes as the candidate | final tag pushed by the supervisor (`git push origin origin/main:refs/tags/<tag>`), which starts `release.yml` | `npm run release-train:promote` locally, in the provider's checkout, clean and at `origin/main` |
| Convergence | no tool of its own: the final pins of both consumers are the proof, and the report says so | `release-train/<pkg>-vX-final.json` landed by the supervisor, then `npm run release-train:verify-final` | manifest set to `completed` with its `final` block and the convergence file of `release-train:converge`, both landed by the supervisor, then `release-train:validate -- --require-complete <tag>` |

## Troubleshooting

- **"the repositories are not ready"**: a checkout is not clean or not at `origin/main`. The command to run is printed.
- **"supervisor guard: … is refused"**: a validation tries to publish. Fix the validation, not the guard.
- **Presentation outdated** ("presentation of train … does not hold"): a commit outside `trainFiles`, or a release URL the train does not know, landed on a repository. Run `ship --run` again, which presents anew.
- **Run held by reviewers** ("run … is waiting"): the `release` environment of the repository still has required reviewers. Remove them in the repository's GitHub settings, then run `ship --run` again.
- **Windows checkout**: `.gitattributes` forces LF on the `sh` shims of `tools/supervisor/guard/` and CRLF on their `.cmd` twins. An `sh` shim in CRLF breaks its shebang, a `.cmd` in LF is misread by `cmd.exe`: keep both rules.
