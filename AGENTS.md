# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a documentation-first hackathon project:

- `README.md` is the short project entry point.
- `PRD.md` contains the bilingual product requirements, architecture decisions, and test strategy.
- `task.md` defines the three-person implementation plan, interface contracts, and integration gates.
- `prize.md` records competition and prize context.

Keep product decisions in `PRD.md` and execution details in `task.md`; avoid duplicating long sections between them. When implementation begins, organize code by the three planned boundaries: local inference, the deterministic incident/capsule engine, and the UI/network plugin layer. Keep synthetic fixtures and scorer-only labels separate so labels cannot leak into model inputs.

## Build, Test, and Development Commands

There is no build system or executable source code yet. For documentation changes, use:

```bash
rg '^#{1,4} ' PRD.md task.md   # review document structure
git diff --check               # catch whitespace errors
git diff --stat                # confirm the change scope
```

When adding an application toolchain, update `README.md` and this guide with the exact install, development, lint, test, and benchmark commands. Do not document placeholder commands that do not run.

## Coding Style & Naming Conventions

Use two-space indentation for Markdown list nesting and fenced code blocks for commands or interfaces. Keep headings descriptive and preserve the PRD’s Chinese/English organization. In TypeScript examples, use `PascalCase` for schemas and interfaces (`IncidentCapsule`, `InferenceAdapter`), `camelCase` for functions (`compileIncident`), and explicit domain names rather than abbreviations. Shared schema changes require coordination across all three workstreams.

## Testing Guidelines

Follow the fixture-driven strategy in `PRD.md`. Prioritize observable invariants: deterministic capsule generation, valid evidence references, allowlisted actions, reproducible simulator results, and zero outbound requests in `Network OFF`. Retain invalid outputs, timeouts, and abstentions in benchmark results. Place tests beside their module or under a clearly documented `tests/` tree, using behavior-focused names such as `network-off-blocks-serpapi`.

## Commit & Pull Request Guidelines

Recent history uses concise imperative subjects, including Conventional Commit prefixes such as `docs:`. Continue with forms like `feat: add capsule compiler` or `test: cover offline transport guard`. Keep each commit focused.

Pull requests should explain the user-visible or architectural change, identify affected contracts, list verification performed, and link the relevant issue or task. Include screenshots for UI changes and benchmark excerpts for inference or scoring changes. Never commit API keys, model binaries, raw private incident data, or generated run artifacts containing secrets.
