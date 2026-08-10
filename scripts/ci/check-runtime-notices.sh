#!/usr/bin/env bash

set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
dockerfile=${1:-$repo_root/Dockerfile}
notices=${2:-$repo_root/THIRD_PARTY_NOTICES.md}

if ! runtime_ref=$(
  awk '
    $1 == "FROM" && $2 ~ /^nginxinc\/nginx-unprivileged:/ {
      image = $2
      count++
    }
    END {
      if (count != 1) exit 1
      print image
    }
  ' "$dockerfile"
); then
  printf 'Expected exactly one nginx runtime image.\n' >&2
  exit 1
fi

if [[ ! "$runtime_ref" =~ ^nginxinc/nginx-unprivileged:([0-9]+\.[0-9]+\.[0-9]+)-alpine[0-9]+\.[0-9]+@sha256:[0-9a-f]{64}$ ]]; then
  printf 'Unexpected nginx runtime image reference: %s\n' "$runtime_ref" >&2
  exit 1
fi

runtime_version=${BASH_REMATCH[1]}
runtime_image=${runtime_ref%@sha256:*}
runtime_digest=${runtime_ref#*@}

if ! grep -Fq "\`$runtime_image\`" "$notices"; then
  printf '%s does not name runtime image %s.\n' "$notices" "$runtime_image" >&2
  exit 1
fi

if ! grep -Fq "NGINX $runtime_version " "$notices"; then
  printf '%s does not name NGINX version %s.\n' "$notices" "$runtime_version" >&2
  exit 1
fi

if ! grep -Fq "\`$runtime_digest\`" "$notices"; then
  printf '%s does not name reviewed runtime digest %s.\n' \
    "$notices" "$runtime_digest" >&2
  exit 1
fi
