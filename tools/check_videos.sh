#!/bin/bash
# Checks every YouTube ID in data/demo-videos.js and data/lectures.js with YouTube's oEmbed endpoint.
# 200 = public and embeddable. 401/403/404 = private, embedding off, or deleted: remove it from the data.
# Usage: bash tools/check_videos.sh      (exit 1 if any ID fails)
cd "$(dirname "$0")/.." || exit 1
fail=0
for id in $(grep -ohE "yt:'[A-Za-z0-9_-]{11}'|\"yt\":\"[A-Za-z0-9_-]{11}\"" data/demo-videos.js data/lectures.js | grep -oE "[A-Za-z0-9_-]{11}" | sort -u); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=$id")
  if [ "$code" != "200" ]; then echo "DEAD $id ($code)"; fail=1; fi
done
[ $fail = 0 ] && echo "all video IDs load"
exit $fail
