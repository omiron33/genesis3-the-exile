#!/bin/sh
# A composited still (picture + lyric layer) of one scene at song time t:
#   tools/still.sh <scene> <t> [samples]   ->  out/portable/stills/<scene>-<t>-full.png
set -e
cd "$(dirname "$0")/.."
exec node tools/render.mjs still --scene "$1" --time "$2" --samples "${3:-4}"
