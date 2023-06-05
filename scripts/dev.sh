function echo_green() {
  echo "\033[32m$1\033[0m"
}
function echo_yellow() {
  echo "\033[33m$1\033[0m"
}
function echo_red() {
  echo "\033[31m$1\033[0m"
}
function echo_cyan() {
  echo "\033[36m$1\033[0m"
}

nx build vue-vine
echo_green "\nBuild vue-vine done!" 
echo_cyan "Start watching changes...\n"
nx watch \
  --projects=@vue-vine/compiler,@vue-vine/vite-plugin,vue-vine \
  --includeDependentProjects \
  -- nx run \$NX_PROJECT_NAME:build
  