# Codex Instructions

## Formatting

- Do not manually change the formatting of existing code. If formatting is required, run `black` on the affected files. The repository uses the **black** formatter.
- Only include formatting changes produced by `black` in your diffs.

## Testing

- After making changes, run `pytest -q` to ensure all tests pass.
