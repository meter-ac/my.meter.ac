#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 3 ]; then
  printf 'Usage: %s IMAGE_REF EXPECTED_REVISION EXPECTED_PLATFORM\n' "$0" >&2
  exit 1
fi

image_ref=$1
expected_revision=$2
expected_platform=$3
error_file=$(mktemp)
trap 'rm -f "$error_file"' EXIT

for attempt in 1 2 3; do
  if inspection=$(docker buildx imagetools inspect "$image_ref" \
    --format '{{json .}}' 2>"$error_file"); then
    digest=$(jq -r '.manifest.digest // empty' <<< "$inspection")
    revision=$(jq -r \
      '.image.config.Labels["org.opencontainers.image.revision"] // empty' \
      <<< "$inspection")
    platform=$(jq -r \
      'if .image.os and .image.architecture then
        .image.os + "/" + .image.architecture
      else
        empty
      end' \
      <<< "$inspection")

    if [[ ! "$digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then
      printf 'Image %s returned an invalid digest: %s\n' "$image_ref" "$digest" >&2
      exit 1
    fi
    if [ "$revision" != "$expected_revision" ]; then
      printf 'Image %s identifies revision %s, expected %s.\n' \
        "$image_ref" "${revision:-<missing>}" "$expected_revision" >&2
      exit 1
    fi
    if [ "$platform" != "$expected_platform" ]; then
      printf 'Image %s targets %s, expected %s.\n' \
        "$image_ref" "${platform:-<missing>}" "$expected_platform" >&2
      exit 1
    fi

    printf '%s\n' "$digest"
    exit 0
  fi

  error=$(<"$error_file")
  if [[ "$error" == *"manifest unknown"* || "$error" == *"not found"* ||
    "$error" == *"Not Found"* ]]; then
    if [ "$attempt" -eq 3 ]; then
      printf 'Image %s does not exist after %s checks.\n' \
        "$image_ref" "$attempt" >&2
      exit 3
    fi
  elif [ "$attempt" -eq 3 ]; then
    printf '%s\n' "$error" >&2
    exit 1
  fi
  sleep $((attempt * 2))
done
