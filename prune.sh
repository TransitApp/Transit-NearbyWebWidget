#!/bin/bash
set -euxo pipefail

find packages services \
  -mindepth 2 -maxdepth 2 ! \( \
  -name 'node_modules' \
  -o -name 'bin' \
  -o -name 'public' \
  -o -name 'routes' \
  -o -name 'views' \
  -o -name 'app.js' \
  -o -name 'apt-packages.txt' \
  -o -name 'package.json' \
  \) -exec rm -rf {} +
