#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
obsidian_app="${HANDBOOK_E2E_OBSIDIAN:-}"
cdp_port="${HANDBOOK_E2E_CDP_PORT:-9234}"
output_root="${HANDBOOK_E2E_OUTPUT_DIR:-}"
plugin_assets="$repo_root/dist"
if [[ "${HANDBOOK_E2E_FIXTURE:-0}" == "1" ]]; then
	plugin_assets="${HANDBOOK_E2E_PLUGIN_DIR:-$plugin_assets}"
elif [[ -n "${HANDBOOK_E2E_PLUGIN_DIR:-}" ]]; then
	printf 'HANDBOOK_E2E_PLUGIN_DIR requires HANDBOOK_E2E_FIXTURE=1; release proof must use dist.\n' >&2
	exit 1
fi

[[ -n "$obsidian_app" && -x "$obsidian_app" ]] || {
	printf 'Set HANDBOOK_E2E_OBSIDIAN to an executable Obsidian 1.13.7 AppImage.\n' >&2
	exit 1
}
if [[ "$(basename "$obsidian_app")" == "AppRun" ]]; then
	host_asset="$(dirname "$obsidian_app")/resources/obsidian.asar"
	expected_host_sha256="a52a7daf1e2460bae03de80f2816604bd16a56cd374fbe5ce8d1a9ef5604059d"
else
	host_asset="$obsidian_app"
	expected_host_sha256="e0d8e0a611624de8c9c7dcd8a9e648279fb0a0d552faa1312b7e4f3a5fa72663"
fi
actual_host_sha256="$(sha256sum "$host_asset" | cut -d ' ' -f 1)"
[[ "$actual_host_sha256" == "$expected_host_sha256" ]] || {
	printf 'Obsidian host differs from the pinned 1.13.7 build: %s\n' "$host_asset" >&2
	exit 1
}
python3 -c 'import websocket' >/dev/null 2>&1 || {
	printf 'Python package websocket-client is required.\n' >&2
	exit 1
}
for asset in main.js manifest.json styles.css; do
	[[ -f "$plugin_assets/$asset" ]] || {
		printf 'Missing plugin asset: %s/%s\n' "$plugin_assets" "$asset" >&2
		exit 1
	}
done
if curl -fsS "http://127.0.0.1:$cdp_port/json/version" >/dev/null 2>&1; then
	printf 'CDP port %s is already in use.\n' "$cdp_port" >&2
	exit 1
fi

vault_root="$(mktemp -d /tmp/handbook-load-vault.XXXXXX)"
profile_root="$(mktemp -d /tmp/handbook-load-profile.XXXXXX)"
app_pid=""
cleanup() {
	if [[ -n "$app_pid" ]]; then
		kill -TERM -- "-$app_pid" 2>/dev/null || true
		wait "$app_pid" 2>/dev/null || true
	fi
	rm -rf -- "$vault_root" "$profile_root"
}
trap cleanup EXIT

if [[ -z "$output_root" ]]; then
	output_root="$(mktemp -d /tmp/handbook-load-output.XXXXXX)"
else
	mkdir -p "$output_root"
	output_root="$(realpath "$output_root")"
fi
case "$output_root/" in
	"$vault_root/"*|"$profile_root/"*) printf 'Output must be outside the disposable vault and profile.\n' >&2; exit 1 ;;
esac

plugin_root="$vault_root/.obsidian/plugins/obsidian-handbook"
mkdir -p "$plugin_root"
cp "$plugin_assets/main.js" "$plugin_assets/manifest.json" "$plugin_assets/styles.css" "$plugin_root/"
printf '[]\n' >"$vault_root/.obsidian/community-plugins.json"
printf '# Plugin load probe\n' >"$vault_root/plugin-load-probe.md"
printf '{"vaults":{"1234567890abcdef":{"path":"%s","ts":%s,"open":true}}}\n' \
	"$vault_root" "$(date +%s000)" >"$profile_root/obsidian.json"
sha256sum "$plugin_root/main.js" >"$output_root/main.js.sha256"

setsid "$obsidian_app" --no-sandbox --disable-gpu --disable-gpu-sandbox --user-data-dir="$profile_root" \
	--remote-debugging-port="$cdp_port" --remote-allow-origins='*' \
	"obsidian://open?path=$vault_root/plugin-load-probe.md" \
	>"$output_root/obsidian.log" 2>&1 &
app_pid=$!

status=0
python3 "$repo_root/tools/e2e/plugin-load-cdp.py" "$cdp_port" "$output_root" "$vault_root" || status=$?
if [[ "$status" -ne 0 ]]; then
	printf 'Plugin load failed; diagnostic files: %s\n' "$output_root" >&2
	tail -n 80 "$output_root/obsidian.log" >&2 || true
	exit "$status"
fi
printf 'Plugin load passed; diagnostic files: %s\n' "$output_root"
