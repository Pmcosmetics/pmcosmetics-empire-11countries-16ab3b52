# PM Cosmetics Hub — Copilot Project Instructions

## Project purpose
PM Cosmetics Hub is an evidence-first e-commerce platform for beauty products across 11 markets:
Egypt, Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman, Jordan, Palestine, Lebanon, and Iran.

## Non-negotiable project rules
- Do not invent, guess, or use placeholder product identity, price, stock, barcode, or image data.
- Treat product intake and publication as evidence-gated.
- Preserve the flow: Evidence -> Validation -> CI -> Publication Gate -> Channel Sync -> Verification.
- Keep product/API publication locked when source evidence has not been validated.
- Never commit secrets, credentials, access tokens, or private keys. Use environment variables and existing secret-management mechanisms.
- Do not weaken, bypass, or remove validation gates merely to make CI green.
- Changes to catalog, inventory, schemas, integrations, or publication logic must preserve validation behavior.
- Prefer small, reviewable changes with clear commit messages.

## Runtime and quality
- Current CI runtime is Node.js 20.
- Use the existing npm scripts and validation commands before changing their behavior.
- Preserve the existing build, validation, and test gates.
- When adding dependencies, explain why they are required and keep the dependency surface minimal.
- Match the existing repository style and structure.

## Data and integrations
- Source evidence must remain traceable.
- Multi-market behavior must respect the configured market definitions and currencies.
- Treat external integrations as unverified until their connection and returned data are independently confirmed.
- Do not claim a storefront, database, connector, or integration is live unless the repository/runtime evidence supports that claim.

## Security
- Never expose secrets in source code, logs, examples, fixtures, or documentation.
- Keep GitHub Actions permissions least-privilege.
- Do not replace pinned GitHub Actions with floating versions without an explicit reason and review.

## Pull requests and commits
- Summarize what changed and why.
- Call out validation performed and any remaining blockers.
- If a change affects publication, catalog, inventory, authentication, payments, or external integrations, explicitly identify the affected gate.
