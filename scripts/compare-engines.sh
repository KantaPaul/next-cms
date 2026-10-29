#!/usr/bin/env bash
# Renders every published builder page and post with both render engines and
# compares the <main> HTML (R686, R810). For local or staging databases only:
# it switches each site's render_engine while it runs and restores it after.
#
# Usage: scripts/compare-engines.sh [base-url]   (default http://localhost:3000)
set -euo pipefail

BASE=${1:-http://localhost:3000}
cd "$(dirname "$0")/.."
DB=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT

# Remember each site's engine so it can be restored, even on failure.
ORIGINAL=$(psql "$DB" -Atc "select string_agg(id || '=' || render_engine, ' ') from sites")
restore() {
  for pair in $ORIGINAL; do
    psql "$DB" -qAtc "update sites set render_engine='${pair#*=}' where id='${pair%%=*}'"
  done
}
trap 'restore; rm -rf "$OUT"' EXIT

URLS=()
while IFS= read -r url; do URLS+=("$url"); done < <(psql "$DB" -Atc "
  select '/' || s.slug || case when p.is_home then '' else '/' || p.slug end
    from pages p join sites s on s.id = p.site_id
   where p.status = 'published' and p.deleted_at is null and p.editor_type = 'builder'
  union all
  select '/' || s.slug || '/blog/' || p.slug
    from posts p join sites s on s.id = p.site_id
   where p.status = 'published' and p.deleted_at is null
  order by 1")

main_html() {
  python3 -c '
import re, sys
html = sys.stdin.read()
match = re.search(r"<main[^>]*>(.*)</main>", html, re.S)
body = match.group(1) if match else "NO <main>"
body = re.sub(r"<script.*?</script>|<!--.*?-->", "", body, flags=re.S)
print(re.sub(r">\s+<", "><", body).strip())'
}

for engine in puck core; do
  psql "$DB" -qAtc "update sites set render_engine='$engine'"
  for url in "${URLS[@]}"; do
    file="$OUT/$engine$(echo "$url" | tr / _)"
    code=$(curl -s -o "$file.raw" -w '%{http_code}' --max-time 180 "$BASE$url")
    main_html < "$file.raw" > "$file"
    echo "$code" > "$file.code"
  done
done

same=0
failed=0
for url in "${URLS[@]}"; do
  name=$(echo "$url" | tr / _)
  codes="$(cat "$OUT/puck$name.code")/$(cat "$OUT/core$name.code")"
  if [[ $codes == 200/200 ]] && cmp -s "$OUT/puck$name" "$OUT/core$name"; then
    same=$((same + 1))
  else
    failed=$((failed + 1))
    echo "DIFF $url (status puck/core: $codes)"
  fi
done
echo "${#URLS[@]} URLs: $same identical, $failed different"
[[ $failed -eq 0 ]]
