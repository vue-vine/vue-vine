#!/bin/bash

function echo_green() {
  printf "\033[32m$1\033[0m \n"
}
function echo_yellow() {
  printf "\033[33m$1\033[0m \n"
}
function echo_red() {
  printf "\033[31m$1\033[0m \n"
}
function echo_cyan() {
  printf "\033[36m$1\033[0m \n"
}

pnpm nx build vue-vine
echo_green "Build vue-vine done!"
echo_cyan "Start watching changes..."
pnpm nx watch \
  --projects=@vue-vine/compiler,@vue-vine/vite-plugin,vue-vine \
  -- nx build vue-vine
