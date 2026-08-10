#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  printf 'Usage: %s IMAGE [EXPECTED_PLATFORM]\n' "$0" >&2
  exit 1
fi

image=$1
expected_platform=${2:-linux/amd64}
allow_http_health_fallback=${ALLOW_HTTP_HEALTH_FALLBACK:-false}
if [ "$allow_http_health_fallback" != false ] && [ "$allow_http_health_fallback" != true ]; then
  printf 'ALLOW_HTTP_HEALTH_FALLBACK must be true or false.\n' >&2
  exit 1
fi
if [ "${CI:-false}" = true ] && [ "$allow_http_health_fallback" = true ]; then
  printf 'HTTP health fallback must not be enabled in CI.\n' >&2
  exit 1
fi
container="my-meter-ac-ci-$PPID-$RANDOM"
work_dir=$(mktemp -d)

cleanup() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    docker logs "$container" 2>/dev/null || true
  fi
  docker rm --force "$container" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
  exit "$result"
}
trap cleanup EXIT

actual_platform=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$image")
if [ "$actual_platform" != "$expected_platform" ]; then
  printf 'Image platform is %s, expected %s.\n' \
    "$actual_platform" "$expected_platform" >&2
  exit 1
fi
if [ "$(docker image inspect --format '{{.Config.User}}' "$image")" != 101 ]; then
  printf 'Image does not declare runtime user 101.\n' >&2
  exit 1
fi

docker run --detach \
  --name "$container" \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --publish 127.0.0.1::8080 \
  "$image" >/dev/null

if [ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$container")" != true ]; then
  printf 'Container root filesystem is not read-only.\n' >&2
  exit 1
fi

published_port=$(docker port "$container" 8080/tcp)
published_port=${published_port##*:}
if [[ ! "$published_port" =~ ^[0-9]+$ ]]; then
  printf 'Could not determine the published nginx port.\n' >&2
  exit 1
fi
base_url="http://127.0.0.1:$published_port"

health=starting
for _ in {1..45}; do
  state=$(docker inspect "$container")
  if [ "$(jq -r '.[0].State.Running' <<< "$state")" != true ]; then
    health=stopped
    break
  fi
  health=$(jq -r '.[0].State.Health.Status // "unsupported"' <<< "$state")
  if [ "$health" = unsupported ]; then
    # Local Podman APIs can omit Docker health status; CI must validate it directly.
    if [ "$allow_http_health_fallback" != true ]; then
      printf 'Runtime does not expose the image health-check status.\n' >&2
      exit 1
    fi
    if curl --fail --silent --show-error --max-time 2 \
      --output /dev/null "$base_url/healthz"; then
      health=healthy
    fi
  fi
  case "$health" in
    healthy) break ;;
    unhealthy) exit 1 ;;
  esac
  sleep 2
done
if [ "$health" != healthy ]; then
  printf 'Container health remained %s.\n' "$health" >&2
  exit 1
fi

for command in node pnpm; do
  if docker exec "$container" sh -c \
    'command -v "$1" >/dev/null 2>&1' sh "$command"; then
    printf 'Runtime unexpectedly contains %s.\n' "$command" >&2
    exit 1
  fi
done

for path in /app /src /tests /.git /playwright-report /test-results; do
  if docker exec "$container" sh -c 'test -e "$1"' sh "$path"; then
    printf 'Runtime unexpectedly contains %s.\n' "$path" >&2
    exit 1
  fi
done

web_root_entries=$(docker exec "$container" sh -c \
  'ls -1A /usr/share/nginx/html | sort')
expected_web_root_entries=$(printf '%s\n' \
  LICENSE.txt NOTICE.txt THIRD_PARTY_NOTICES.txt assets index.html)
if [ "$web_root_entries" != "$expected_web_root_entries" ]; then
  printf 'Unexpected files in the runtime web root:\n%s\n' \
    "$web_root_entries" >&2
  exit 1
fi

cap_eff=$(docker exec "$container" sh -c \
  "awk '/^CapEff:/ { print \$2 }' /proc/1/status")
no_new_privs=$(docker exec "$container" sh -c \
  "awk '/^NoNewPrivs:/ { print \$2 }' /proc/1/status")
if [ "$cap_eff" != 0000000000000000 ] || [ "$no_new_privs" != 1 ]; then
  printf 'Container capabilities or no-new-privileges are not hardened.\n' >&2
  exit 1
fi

curl_args=(--fail --silent --show-error --max-time 10)

curl "${curl_args[@]}" \
  --dump-header "$work_dir/root.headers" \
  --output "$work_dir/root.html" \
  "$base_url/"
grep -q '<div id="root"></div>' "$work_dir/root.html"
grep -Eqi '^Cache-Control: no-cache' "$work_dir/root.headers"
grep -Eqi '^Content-Security-Policy: .+' "$work_dir/root.headers"
grep -Eqi '^Permissions-Policy: .+' "$work_dir/root.headers"
grep -Eqi '^Referrer-Policy: origin' "$work_dir/root.headers"
grep -Eqi '^X-Content-Type-Options: nosniff' "$work_dir/root.headers"
grep -Eqi '^X-Frame-Options: DENY' "$work_dir/root.headers"

for path in '/?view=table' '/?node=N06'; do
  curl "${curl_args[@]}" --output /dev/null "$base_url$path"
done

curl "${curl_args[@]}" \
  --dump-header "$work_dir/health.headers" \
  --output "$work_dir/health.txt" \
  "$base_url/healthz"
grep -qx 'ok' "$work_dir/health.txt"
grep -Eqi '^Cache-Control: no-store' "$work_dir/health.headers"

asset_path=$(
  awk '
    match($0, /\/assets\/[^" ]+\.js/) {
      print substr($0, RSTART, RLENGTH)
      exit
    }
  ' "$work_dir/root.html"
)
if [ -z "$asset_path" ]; then
  printf 'No generated JavaScript asset was referenced by index.html.\n' >&2
  exit 1
fi
curl "${curl_args[@]}" \
  --dump-header "$work_dir/asset.headers" \
  --output /dev/null \
  "$base_url$asset_path"
grep -Eqi '^Cache-Control: public, max-age=31536000, immutable' \
  "$work_dir/asset.headers"

for legal_path in LICENSE.txt NOTICE.txt THIRD_PARTY_NOTICES.txt; do
  curl "${curl_args[@]}" \
    --dump-header "$work_dir/$legal_path.headers" \
    --output "$work_dir/$legal_path" \
    "$base_url/$legal_path"
  grep -Eqi '^Cache-Control: no-cache' "$work_dir/$legal_path.headers"
done
grep -q 'Apache License' "$work_dir/LICENSE.txt"
grep -q 'Copyright 2026 METER.AC contributors' "$work_dir/NOTICE.txt"
grep -q 'Hippocratic License 2.1' "$work_dir/THIRD_PARTY_NOTICES.txt"

for path in /does-not-exist /50x.html; do
  status=$(curl --silent --show-error --max-time 10 \
    --output /dev/null --write-out '%{http_code}' "$base_url$path")
  if [ "$status" != 404 ]; then
    printf '%s returned HTTP %s, expected 404.\n' "$path" "$status" >&2
    exit 1
  fi
done

printf 'Validated %s on %s.\n' "$image" "$expected_platform"
