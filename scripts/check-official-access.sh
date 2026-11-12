#!/bin/sh
# Read-only requests through inherited proxy/CA; keep TLS verification enabled.
set -u
result=0
for official_url in \
  https://www.e-stat.go.jp/api/ \
  https://www.maff.go.jp/j/tokei/
do
  if ! curl --fail --location --silent --show-error --max-time 25 --output /dev/null "$official_url"; then
    printf 'FAILED: %s\n' "$official_url"
    result=1
  else
    printf 'OK: %s\n' "$official_url"
  fi
done
exit "$result"
