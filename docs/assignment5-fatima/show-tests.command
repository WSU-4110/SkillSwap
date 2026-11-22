#!/bin/bash
cd "$(dirname "$0")/../../backend" || exit 1
test_node="$(command -v node)"
bundled_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [ -x "$bundled_node" ]; then test_node="$bundled_node"; fi
for test_file in teaching-list teaching-add learning-list learning-add public-profile skill-matches; do
  clear
  printf '\nAssignment 5 - %s\n\n' "$test_file"
  "$test_node" node_modules/jest/bin/jest.js --config jest.fatima.config.cjs --runInBand --verbose --runTestsByPath "tests/fatima/$test_file.test.js"
  result=$?
  printf '\nExit code: %s\n' "$result"
  if [ "$result" -ne 0 ]; then exit "$result"; fi
  printf '\nTake a screenshot of this result, then press Enter for the next method.\n'
  read -r
 done
