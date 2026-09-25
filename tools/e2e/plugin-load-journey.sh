#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
obsidian_app="${HANDBOOK_E2E_OBSIDIAN:-}"
plugin_source="${HANDBOOK_E2E_PLUGIN_DIR:-$repo_root/dist}"
expected_version="${HANDBOOK_E2E_EXPECTED_OBSIDIAN_VERSION:-1.13.7}"
cdp_port="${HANDBOOK_E2E_CDP_PORT:-9233}"
output_root="${HANDBOOK_E2E_OUTPUT_DIR:-}"

[[ -n "$obsidian_app" && -x "$obsidian_app" ]] || {
	printf 'Set HANDBOOK_E2E_OBSIDIAN to an executable Obsidian 1.13.7 binary.\n' >&2
	exit 1
}
python3 -c 'import websocket' || {
	printf 'Python package websocket-client is required.\n' >&2
	exit 1
}
for asset in main.js manifest.json styles.css; do
	[[ -f "$plugin_source/$asset" ]] || {
		printf 'Plugin-load journey is missing %s/%s.\n' "$plugin_source" "$asset" >&2
		exit 1
	}
done
if curl -fsS "http://127.0.0.1:$cdp_port/json/version" >/dev/null 2>&1; then
	printf 'CDP port %s is already in use.\n' "$cdp_port" >&2
	exit 1
fi

vault_root="$(mktemp -d /tmp/handbook-plugin-load-vault.XXXXXX)"
profile_root="$(mktemp -d /tmp/handbook-plugin-load-profile.XXXXXX)"
app_pid=""
cleanup() {
	set +e
	if [[ -n "$app_pid" ]]; then
		kill -TERM -- "-$app_pid" 2>/dev/null || true
		for _attempt in {1..20}; do
			kill -0 -- "-$app_pid" 2>/dev/null || break
			sleep 0.1
		done
		kill -KILL -- "-$app_pid" 2>/dev/null || true
		wait "$app_pid" 2>/dev/null || true
	fi
	for transient_root in "$vault_root" "$profile_root"; do
		for _attempt in {1..20}; do
			rm -rf -- "$transient_root"
			[[ ! -e "$transient_root" ]] && break
			sleep 0.1
		done
		if [[ -e "$transient_root" ]]; then
			printf 'Could not remove disposable E2E directory: %s\n' "$transient_root" >&2
		fi
	done
}
trap cleanup EXIT

if [[ -z "$output_root" ]]; then
	output_root="$(mktemp -d /tmp/handbook-plugin-load-output.XXXXXX)"
else
	mkdir -p "$output_root"
	output_root="$(cd "$output_root" && pwd)"
fi
case "$output_root/" in
	"$vault_root/"*|"$profile_root/"*)
		printf 'HANDBOOK_E2E_OUTPUT_DIR must stay outside the disposable vault and profile.\n' >&2
		exit 1
		;;
esac

plugin_root="$vault_root/.obsidian/plugins/obsidian-handbook"
mkdir -p "$plugin_root"
cp "$plugin_source/main.js" "$plugin_source/manifest.json" "$plugin_source/styles.css" "$plugin_root/"
printf '["obsidian-handbook"]\n' >"$vault_root/.obsidian/community-plugins.json"
printf '# Handbook plugin-load probe\n' >"$vault_root/plugin-load-probe.md"
printf '{"vaults":{"handbook-plugin-load":{"path":"%s","ts":%s,"open":true}}}\n' \
	"$vault_root" "$(date +%s000)" >"$profile_root/obsidian.json"

setsid "$obsidian_app" --no-sandbox --disable-gpu --disable-gpu-sandbox \
	--user-data-dir="$profile_root" --remote-debugging-port="$cdp_port" \
	--remote-allow-origins='*' "obsidian://open?path=$vault_root/plugin-load-probe.md" \
	>"$output_root/obsidian.log" 2>&1 &
app_pid=$!

set +e
python3 "$repo_root/tools/e2e/plugin-load-cdp.py" \
	--port "$cdp_port" \
	--output "$output_root" \
	--vault "$vault_root" \
	--plugin "$plugin_root" \
	--expected-version "$expected_version"
status=$?
set -e

printf 'Plugin-load report: %s/REPORT.json\n' "$output_root"
printf 'Obsidian log: %s/obsidian.log\n' "$output_root"
exit "$status"
