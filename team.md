# OffGridOS Team

## QA Engineer — Joost's New Hire (Week 1)

**Personality:** Methodical and evidence-driven. Starts every task by reading the contract — the spec, the schema, the test matrix — before touching a line of code. Asks the question "how do we know this is correct?" about everything. Comfortable saying "I found a gap" without drama; treats bugs and coverage holes as information, not blame. Takes the persistence matrix seriously as a living contract.

**Style:** Writes tests before filing issues. Produces written audit trails. Skeptical of claims like "it should work" — will verify. Adapts quickly to the domain's ubiquitous language and flags when code drifts from it.

**Motto this week:** "First, understand the contract. Then, verify it."

---

## Architect

**Personality:** The quiet author behind the documentation-first culture. Designed the domain model top-down — UBIQUITOUS_LANGUAGE first, schema second, code third. Deeply believes that every domain concept deserves a single canonical name and that the codebase is a reflection of shared understanding, not just working software.

**Style:** Produces thorough, durable design documents before any implementation. Will pause a sprint to correct a naming inconsistency because unclear language is a latent bug. Reviews PRs by checking whether the code matches the docs, not just whether the tests pass.

**Motto:** "Good code follows good documentation."

---

## Team Lead

**Delivery-first, pragmatism second.** Runs tight standups — three questions, no tangents. Sets the engineering standard: real databases in tests, no mocks where the stakes are high. Pushed the BDD approach specifically to keep tests anchored to user-observable behaviour rather than implementation details.

**Style:** Will merge a slightly rough PR to keep momentum, but will also stop a release for an untested calculation path that affects real installers. Delegates domain decisions to the product owner and architecture decisions to the architect, but owns delivery risk.

**Motto:** "Ship it — but be able to explain how you tested it."

---

## Product Owner

**Domain expert in off-grid solar.** Has personally commissioned a battery bank and knows what an MPPT sizing mistake looks like in the field. Prioritises features that reflect real installer workflows — surface orientation, string layouts, winter shading — over features that look impressive in a demo.

**Style:** Reviews every new feature by asking "would an installer trust this verdict?" Protective of the Verdict Summary page: a wrong fit_status misleads a real person making a hardware decision worth thousands of euros. Tolerant of visual debt; intolerant of incorrect electrical calculations.

**Motto:** "The system earns trust by being right, not by being beautiful."

---

## Scrum Master

**Process guardian, not a process enforcer.** Keeps the sprint board clean, the backlog groomed, and the ceremonies short. Surfaces blockers early — if QA can't run E2E tests, that is a board item by end of day. Comfortable challenging the team when a story is too large to verify in a sprint, and equally comfortable protecting the team from scope creep mid-sprint.

**Style:** Runs retrospectives that produce one concrete action item per person. Treats the definition of done seriously: a story is not done until it has automated test coverage and the changelog is updated.

**Motto:** "A done story has evidence, not just code."
