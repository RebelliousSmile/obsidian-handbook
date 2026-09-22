#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
obsidian_app="${HANDBOOK_E2E_OBSIDIAN:-}"
cdp_port="${HANDBOOK_E2E_CDP_PORT:-9232}"
output_root="${HANDBOOK_E2E_OUTPUT_DIR:-}"

[[ -n "$obsidian_app" && -x "$obsidian_app" ]] || {
	printf 'Set HANDBOOK_E2E_OBSIDIAN to an executable Obsidian AppImage.\n' >&2
	exit 1
}
python3 -c 'import websocket' || {
	printf 'Python package websocket-client is required.\n' >&2
	exit 1
}
for asset in main.js manifest.json styles.css; do
	[[ -f "$repo_root/dist/$asset" ]] || {
		printf 'Build the plugin before running this journey: missing dist/%s.\n' "$asset" >&2
		exit 1
	}
done
if curl -fsS "http://127.0.0.1:$cdp_port/json/version" >/dev/null 2>&1; then
	printf 'CDP port %s is already in use.\n' "$cdp_port" >&2
	exit 1
fi

vault_root="$(mktemp -d /tmp/handbook-layout-vault.XXXXXX)"
profile_root="$(mktemp -d /tmp/handbook-layout-profile.XXXXXX)"
app_pid=""
cleanup() {
	if [[ -n "$app_pid" ]]; then
		kill -TERM -- "-$app_pid" 2>/dev/null || true
		wait "$app_pid" 2>/dev/null || true
	fi
	rm -rf -- "$vault_root"
	rm -rf -- "$profile_root"
}
trap cleanup EXIT

if [[ -z "$output_root" ]]; then
	output_root="$(mktemp -d /tmp/handbook-layout-output.XXXXXX)"
else
	mkdir -p "$output_root"
fi
plugin_root="$vault_root/.obsidian/plugins/obsidian-handbook"
mkdir -p "$plugin_root"
cp "$repo_root/dist/main.js" "$repo_root/dist/manifest.json" "$repo_root/dist/styles.css" "$plugin_root/"
printf '["obsidian-handbook"]\n' >"$vault_root/.obsidian/community-plugins.json"
cp "$repo_root/tools/e2e/fixtures/layout-regions-probe.md" "$vault_root/layout-regions-probe.md"
cp "$repo_root/tools/e2e/fixtures/layout-regions-print-probe.md" "$vault_root/layout-regions-print-probe.md"
printf '{"vaults":{"1234567890abcdef":{"path":"%s","ts":%s,"open":true}}}\n' \
	"$vault_root" "$(date +%s000)" >"$profile_root/obsidian.json"

setsid "$obsidian_app" --no-sandbox --disable-gpu --disable-gpu-sandbox --user-data-dir="$profile_root" \
	--remote-debugging-port="$cdp_port" --remote-allow-origins='*' \
	"obsidian://open?path=$vault_root/layout-regions-probe.md" \
	>"$output_root/obsidian.log" 2>&1 &
app_pid=$!

python3 "$repo_root/tools/e2e/layout-regions-cdp.py" "$cdp_port" "$output_root" "$vault_root"
printf 'Screenshots: %s\n' "$output_root"
