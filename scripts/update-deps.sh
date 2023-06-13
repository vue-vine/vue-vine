#!/bin/bash

for package in packages/*/; do
  cd "$package"
  printf "\n\033[36mUpdating deps for $package\033[0m\n"
  pnpm taze -w
  cd ../..
done
