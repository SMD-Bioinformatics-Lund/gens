# Repository Guidelines

## Project Structure & Module Organization
- `gens/` holds the Python backend (Flask/FastAPI entrypoints in `app.py`/`wsgi.py`, blueprints, CLI, and DB logic); keep new services under `gens/{blueprints,crud,models}`.
- `frontend/` contains TypeScript/JS and SCSS; built assets land in `build/` and then into `gens/blueprints/*/static/`.
- `tests/` has pytest suites (CLI, parsing, util scripts) and fixtures under `tests/data/`.
- `docs/`, `images/`, and `utils/` store guides, static assets, and helper scripts; `volumes/` and `dump/` are runtime data mounts.

## Build, Test, and Development Commands
- Install deps: `pip install -r requirements-dev.txt && pip install -e .` and `npm install`.
- Backend lifecycle: `make build` to build Docker images, `make init` to seed demo data, `make up`/`make down` to start/stop the stack, `make logs SERVICE='gens'` to tail a service.
- Frontend: `npm run build` (gulp bundle) or `npm run watch` during iterative work; `npm run sync` copies compiled assets into the Flask blueprints.
- Tests and quality: `pytest -q` (use `--cov=gens` for coverage), `npm test`, `npm run lint`, `npm run prettier`, and `npm run typecheck` keep TS types aligned.

## Coding Style & Naming Conventions
- Python: 4-space indent, type hints encouraged; format with `black`, import order via `isort`, and lint with `pylint`/`mypy` (config in `pyproject.toml`).
- TypeScript/JS: follow ESLint + Prettier defaults; keep modules small and prefer functional utilities in `frontend/js/util/`. Use PascalCase for components, camelCase for functions/variables, and SCSS partials under `frontend/css/`.
- Naming: tests as `test_*.py`; prefer descriptive file names that mirror feature areas (e.g., `frontend/js/components/SampleTable.ts`).

## Testing Guidelines
- Primary backend tests: pytest in `tests/`; align fixtures with `tests/data/` and prefer parametrized cases for new inputs.
- Frontend tests: Jest with jsdom; mock DOM/HTTP in `frontend/__mocks__/`.
- Add coverage when touching logic-heavy modules; aim to keep or improve existing coverage thresholds (`pyproject.toml` configures coverage paths).

## Commit & Pull Request Guidelines
- Commits use short, present-tense summaries (recent history favors concise descriptions over Conventional Commits).
- PRs should include: problem/solution highlights, linked issues, commands run (tests/linters), and screenshots or GIFs for UI-visible changes.
- Keep diffs scoped; note any migrations, data downloads (`volumes/gens/data`), or config touches in the PR description.
