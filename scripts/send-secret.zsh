#!/bin/zsh
# Prompt input is hidden and absent from shell history and process arguments.
set -eu
secret_fifo=${1:-.secrets/input.fifo}
if [[ ! -p "$secret_fifo" || -L "$secret_fifo" ]]; then
  print -u2 'Start the secret receiver first.'
  exit 1
fi
read -rs 'boom_secret_value?Paste secret (hidden): '
print
if [[ -z "$boom_secret_value" ]]; then
  print -u2 'No secret entered.'
  exit 1
fi
# printf is a shell builtin, so the value is not a child-process argument.
printf '%s\n' "$boom_secret_value" > "$secret_fifo"
unset boom_secret_value
print 'Secret passed to receiver.'
