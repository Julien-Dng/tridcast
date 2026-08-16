# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a minimal scaffold containing only `README.md`. Keep top-level files limited to project-wide documentation and configuration. As implementation is added, place application code under `src/`, tests under `tests/` (or next to source files when the chosen framework favors colocated tests), and static resources under `assets/`. Group code by feature or domain rather than accumulating unrelated utilities in one module. Update this guide and `README.md` whenever the layout or toolchain changes.

## Build, Test, and Development Commands

No build system, package manager, or test runner is configured yet. Before adding one, document the required runtime version and expose a small, predictable command set. Prefer standard entry points such as:

- `npm run dev` — start the local development environment.
- `npm test` — run the complete automated test suite.
- `npm run lint` — check formatting and static-analysis rules.
- `npm run build` — produce a release-ready artifact.

These commands are examples, not currently available. Until tooling exists, use `git diff --check` to catch whitespace errors before committing.

## Coding Style & Naming Conventions

Adopt the formatter and linter standard for the language introduced, commit their configuration, and avoid manual style exceptions. Use consistent indentation within each language (prefer the formatter's default). Choose descriptive names: `camelCase` for variables and functions, `PascalCase` for types or components, and kebab-case for documentation and asset filenames. Keep modules focused and public interfaces documented.

## Testing Guidelines

Add tests with every behavior change or bug fix once executable code exists. Name tests after observable behavior, for example `returns_error_for_invalid_input`. Cover normal paths, boundary cases, and failures. Do not merge a new test framework without documenting its setup and test command here.

## Commit & Pull Request Guidelines

The history contains only `first commit`, so no established commit convention exists. Use short, imperative subjects such as `Add episode parser`; keep each commit focused. Pull requests should explain the problem and solution, list verification performed, and link relevant issues. Include screenshots or recordings for visual changes and call out configuration, migration, or compatibility impacts.

## Security & Configuration

Never commit credentials, tokens, or local environment files. Provide sanitized examples (such as `.env.example`) for required settings, and document secure defaults in `README.md`.
