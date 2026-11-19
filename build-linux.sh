#!/bin/bash
set -euo pipefail
src='/mnt/d/20-radiosync/Radiosync Desktop'
w=$(mktemp -d "$HOME/radiosync-build.XXXXXXXX")
echo "Workspace: $w"
cd "$w"
mkdir tools project
cd tools
curl -fsSL --retry 2 https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o sums
f=$(awk '/ node-v[0-9.]+-linux-x64\.tar\.xz$/ {print $2}' sums)
test -n "$f"
v=${f#node-}
v=${v%-linux-x64.tar.xz}
curl -fsSL --retry 2 "https://nodejs.org/dist/$v/$f" -o "$f"
grep " $f$" sums | sha256sum -c -
tar -xf "$f"
export PATH="$PWD/${f%.tar.xz}/bin:/usr/bin:/bin"
cd ../project
cp -r "$src/src" "$src/resources" "$src/scripts" "$src/package.json" "$src/package-lock.json" . 2>/dev/null || true
for f in "$src"/electron*.ts "$src"/electron*.yml "$src"/tsconfig*.json; do
 [ -f "$f" ] && cp "$f" .
done
npm ci --no-audit --no-fund
npm run package:linux
mkdir -p "$src/dist/linux"
cp dist/linux/*.AppImage dist/linux/*.deb "$src/dist/linux/"
ls -lh "$src/dist/linux/"