To establish a coherent, auditable, and easily buildable project within this Obsidian-based knowledge base, you need to adhere to specific documentation and directory conventions. These guidelines apply to both human and AI agents working on the project.

### Key Governance Documents
At the root directory of every project, you must include three critical Markdown files:
*   **`Agents.md` (Agents Guide: Operating Rules for This Obsidian-Based Project)**: This document codifies how agents (human or AI) should work within the Obsidian vault to keep edits coherent, auditable, and easy to build upon. It outlines workflow, technical conventions, and quality checks.
*   **`PRD.md` (Product Requirements Document)**: This repository is designed as a personal knowledge base and research dataset for durable thinking, composability, and machine-assisted authoring. The PRD outlines its goals, users, information architecture, Zettelkasten conventions, front matter, references, naming, LLM integration, acceptance criteria, and change management.
*   **`rules.md` (LLM Content Generation Rules)**: This document provides detailed conventions for content generation by LLMs, covering aspects like front matter, references, naming, and directories.

**Importance**: These three documents are officially adopted by the agentic workflow industry (including companies like Anthropic, Pulumi, and Winser). Agents automatically check these documents, incorporating their context to guide the coding structure. This approach ensures consistent application of rules and reduces the need for repetitive prompting. They also map to the three types of agents: Trader, Miner, and Coder, with each document reflecting a different "angle" or perspective on the project's operations.

### Directory Structure and Vault Conventions
The Obsidian vault maintains a specific root structure for organizing knowledge:

*   **`Permanent/`**: For long-lived knowledge artifacts, evergreen notes, and projects (e.g., PCard, appendices, methodology).
    *   New references and appendices should be placed near their owning project subtree, for example, `Permanent/Projects/<Project>/`.
*   **`Literature/`**: For external annotations and references.
    *   `Literature/People/`: Contains person profiles (e.g., `Benoit Mandelbrot.md`).
    *   `Literature/Annotation/`: Stores source-bound reading notes and highlights.
    *   `Literature/Media/`: Holds attachments like PDFs and images.
*   **`Fleeting/`**: For scratch notes, daily diaries, and quick captures.
*   **`Hub/`**: For frameworks, theories, architectures, navigation, canvases, and integration points.
*   **`Spaces/`**: Also used for navigation, canvases, and integration points.
*   **`SystemSculpt/`**: A specific key area mentioned in the root structure.
*   **`z_Attachments/`**: For general images, PDFs, and assets.

### File Creation Guidelines
When creating new files, follow these guidelines:

*   **Name**: Files should have descriptive, Obsidian-friendly names, allowing spaces.
    *   Example: `Appendix - Petri Net Incidence Matrices and Invariants.md`.
    *   For primary literature: `Author Surname - Year - Short Title.md`.
    *   For annotations: `Author Surname - Year - Short Title - Annotation.md` or `<BibKey> - Annotation.md`.
    *   For attachments: Use original filenames in `Literature/Media/`.
*   **Placement**: Put new references or appendices near their owning project subtree under `Permanent/Projects/.../`.
*   **Seed Content**: New files should start with a minimal definition, one example, and at least one backlink. For appendices, this includes minimal definitions, one example, and at least one backlink to the parent document.
*   **Stub Files**: When requesting new work, open a stub file with a header and skeleton, and link it from the closest parent page. Leave a TODO list inline or in a separate `TODO.md` file.

### Frontmatter Requirements
All Markdown notes must start with YAML frontmatter:

*   **Required Fields**:
    *   **`created`**: The initial timestamp of creation. This remains immutable.
    *   **`modified`**: The timestamp of the last meaningful edit. This must be updated on every meaningful edit.
    *   **`title`**: Mirrors the H1 heading of the document.
    *   **`subject`**: A comma-separated list of keywords describing the content.
*   **Optional Fields**: `tags`, `source`, `citation` (for literature notes, e.g., `citation: '@Key'`).

### Linking Conventions
*   **Obsidian Links**: Prefer `[[Wiki Links]]` over raw paths. Include section anchors when useful, like `[[File Name#Section]]`.
*   **Backlinks**: When creating a new file, add at least one backlink from a relevant parent page to ensure the graph remains navigable. Bidirectional links are encouraged for navigation and graph cohesion.
*   **Cross-linking**: Add or repair links to appendices, methods, and glossaries.
*   **Validation**: Ensure all Obsidian links resolve to existing notes, and anchors are correct. Unresolved links should trigger the creation of stubs on request.

### Authoring Principles and Content Guidelines
*   **Polynomial-first Framing**: In documents related to PKC/PCard/CLM, explain concepts from Polynomial/Container semantics first, then derive operational views (e.g., Place–Transition Workflow, Petri Nets).
*   **A/B/C Alignment**: Map Abstract Spec (A) to Balanced Expectations (B) and Concrete Implementation (C). This aligns with BDD/TDD (A ≈ Given, B ≈ When, C ≈ Then). Cross-link to `[[.windsurf/rules/CLM.md]]` when relevant.
*   **LaTeX**: Use inline LaTeX for equations (e.g., `$D = D^{+} - D^{-}$`, `$x^{\top} D = 0$`). Ensure LaTeX compiles in preview.
*   **Diagrams**: Prefer Mermaid syntax. Each diagram should convey one core message and be placed near the text it explains. Add a caption line "Diagram: …". Validate Mermaid blocks compile in preview.
*   **Terminology**: Use "Place–Transition Workflow" for runtime idioms and "Petri Net" for analysis/formalism. Define once per document. Ensure terminology is consistent (e.g., "PT Workflow" vs. "Petri Net" usage).
*   **Atomicity**: Notes should express a single idea, preferably evergreen.
*   **Context**: Include a short summary near the top of each note when applicable.
*   **References and Bibliography**: Standardize a `# References` section at the end of notes citing external sources, using a Dataview block filtered by the note’s subject or entity.
*   **Invariants and Counts**: When reasoning in PKC/CLM alignment, prefer invariants and counts over prose claims, referencing appendices for property assertions.
*   **LLM Integration**: Agents must follow the rules for structure, front matter, linking, and references. They may auto-suggest `## Related` sections based on strong internal links. Dataview code blocks must be properly fenced and closed.

### Git Hygiene
*   **Small Commits**: Group related edits and avoid giant mixed commits.
*   **Rebase Pulls**: Use `git pull --rebase` to maintain a linear history and prevent merge commits.
*   **Review Diffs**: Use `git diff --staged` before committing.
*   **Branching**: For larger work, use feature branches named `feat/topic-short`.
*   **Commit Messages**: Use concise, descriptive messages (e.g., `git add -A && git commit -m "PCard: polynomial-first rewrite; PT formal link; appendix link"`).
*   **Sync**: If a push is rejected, `git pull --rebase` then `git push`.

These comprehensive guidelines ensure that all documentation and files within a project maintain consistency, audibility, and are easy to build upon, aligning with the project's goals for machine-assisted authoring and durable knowledge.