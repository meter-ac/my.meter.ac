#!/usr/bin/env bash

set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
dockerfile=${1:-$repo_root/Dockerfile}
package_json=${2:-$repo_root/package.json}

if ! node_image=$(
  awk '
    $1 == "FROM" && $3 == "AS" && $4 == "build" {
      image = $2
      count++
    }
    END {
      if (count != 1) exit 1
      print image
    }
  ' "$dockerfile"
); then
  printf 'Expected exactly one Dockerfile build stage.\n' >&2
  exit 1
fi

if [[ ! "$node_image" =~ ^node:([0-9]+\.[0-9]+\.[0-9]+)-alpine[0-9]+\.[0-9]+@sha256:[0-9a-f]{64}$ ]]; then
  printf 'Unexpected Node build image reference: %s\n' "$node_image" >&2
  exit 1
fi

node_version=${BASH_REMATCH[1]}
node_engine=$(jq -er '.engines.node' "$package_json")
if [ "$node_engine" != "${node_version%%.*}.x" ]; then
  printf 'Node image %s does not satisfy the declared %s engine policy.\n' \
    "$node_version" "$node_engine" >&2
  exit 1
fi

printf '%s\n' "$node_version"
