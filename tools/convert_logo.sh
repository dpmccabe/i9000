#!/bin/zsh

set -e

rsvg-convert -h 32 logo/logo.svg > ../svelte/public/images/icon32.png

rsvg-convert -h 16 logo/logo.svg > ../svelte/public/images/icon16.png
rsvg-convert -h 32 logo/logo.svg > ../svelte/public/images/icon32.png
rsvg-convert -h 48 logo/logo.svg > ../svelte/public/images/icon48.png
rsvg-convert -h 64 logo/logo.svg > ../svelte/public/images/icon64.png
rsvg-convert -h 72 logo/logo.svg > ../svelte/public/images/icon72.png
rsvg-convert -h 76 logo/logo.svg > ../svelte/public/images/icon76.png
rsvg-convert -h 96 logo/logo.svg > ../svelte/public/images/icon96.png
rsvg-convert -h 114 logo/logo.svg > ../svelte/public/images/icon114.png
rsvg-convert -h 120 logo/logo.svg > ../svelte/public/images/icon120.png
rsvg-convert -h 128 logo/logo.svg > ../svelte/public/images/icon128.png
rsvg-convert -h 144 logo/logo.svg > ../svelte/public/images/icon144.png
rsvg-convert -h 152 logo/logo.svg > ../svelte/public/images/icon152.png
rsvg-convert -h 180 logo/logo.svg > ../svelte/public/images/icon180.png
rsvg-convert -h 192 logo/logo.svg > ../svelte/public/images/icon192.png
rsvg-convert -h 256 logo/logo.svg > ../svelte/public/images/icon256.png
rsvg-convert -h 384 logo/logo.svg > ../svelte/public/images/icon384.png
rsvg-convert -h 512 logo/logo.svg > ../svelte/public/images/icon512.png
rsvg-convert -h 1024 logo/logo.svg > ../svelte/public/images/icon1024.png

cp ../svelte/public/images/icon16.png ../svelte/public/favicon.png

mkdir -p /tmp/AppIcon.iconset

cp ../svelte/public/images/icon16.png /tmp/AppIcon.iconset/icon_16x16.png
cp ../svelte/public/images/icon32.png /tmp/AppIcon.iconset/icon_16x16@2x.png
cp ../svelte/public/images/icon32.png /tmp/AppIcon.iconset/icon_32x32.png
cp ../svelte/public/images/icon64.png /tmp/AppIcon.iconset/icon_32x32@2x.png
cp ../svelte/public/images/icon128.png /tmp/AppIcon.iconset/icon_128x128.png
cp ../svelte/public/images/icon256.png /tmp/AppIcon.iconset/icon_128x128x@2x.png
cp ../svelte/public/images/icon256.png /tmp/AppIcon.iconset/icon_256x256.png
cp ../svelte/public/images/icon512.png /tmp/AppIcon.iconset/icon_256x256@2x.png
cp ../svelte/public/images/icon512.png /tmp/AppIcon.iconset/icon_512x512.png
cp ../svelte/public/images/icon1024.png /tmp/AppIcon.iconset/icon_512x512@2x.png

iconutil -c icns /tmp/AppIcon.iconset/
mv /tmp/AppIcon.icns /Applications/Incandenza\ 9000.app/Contents/Resources/

rm -r /tmp/AppIcon.iconset
