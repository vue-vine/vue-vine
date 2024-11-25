if [ "${RUN_ENV:-}" = "ci" ]; then pnpm build:eslint; fi
pnpm eslint .
