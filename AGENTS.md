# AGENTS.md

Repository-specific guidance for OffGridOS.

## Working conventions

- Treat [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) as the canonical terminology source for this repository.
- Keep terminology aligned with [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) throughout code, UI labels, validation messages, and documentation.
- When adding, renaming, or removing domain concepts, update [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) in the same change when practical.
- Treat `ok` from the user as an explicit instruction to proceed immediately with the next sensible step unless the user explicitly narrows or changes direction.
- Use `NOW`, `NEXT`, and `LATER` as the default structure for [TODO.md](./TODO.md) and [ROADMAP.md](./ROADMAP.md).
- Keep [TODO.md](./TODO.md) concrete and near-term.
- Keep [ROADMAP.md](./ROADMAP.md) higher-level and directional.
- Record notable repository changes in [CHANGELOG.md](./CHANGELOG.md) in reverse chronological order.
- Update [README.md](./README.md) when the documentation set changes.

## Code and docs

- Prefer small, focused changes.
- Do not rename domain concepts casually; check [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) first.
- When adding new durable repository conventions, record them here so future work follows them automatically.
