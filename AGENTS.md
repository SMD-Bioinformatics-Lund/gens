# Codex Instructions

## Formatting

- Never touch existing styling. Only focus on the logical changes.

## Testing

- After making changes, run `pytest -q` to ensure all tests pass.
- After making changes, do type checking using `mypy gens`
- Also after making changes, do type checking of typescript parts using `npx tsc`

## Codex review guidelines

- At the end of a review, leave a summarizing comment. This should contain a brief summarizing assessment and possibly bullet points with what is looking good and what could potentially be improved.
- Don't let this alter the default behaviour with commenting on specific points in the code and leaving a thumbs up on the PR if looking OK.
