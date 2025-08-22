---
created: 2025-08-22T15:27:25+08:00
modified: 2025-08-22T15:27:25+08:00
title: LLM Content Generation Rules
subject: LLM, content-generation, conventions, PKC, obsidian
---

# LLM Content Generation Rules

This document provides detailed conventions for content generation by LLMs, covering aspects like front matter, references, naming, and directories.

## Frontmatter Requirements

All Markdown notes must start with YAML frontmatter containing:

### Required Fields
- **`created`**: Initial timestamp (ISO 8601 format), remains immutable
- **`modified`**: Last meaningful edit timestamp, update on every significant change
- **`title`**: Mirrors the H1 heading of the document
- **`subject`**: Comma-separated keywords describing content

### Optional Fields
- **`tags`**: Additional categorization tags
- **`source`**: Source reference for external content
- **`citation`**: For literature notes (e.g., `citation: '@Key'`)

### Example Frontmatter
```yaml
---
created: 2025-08-22T15:27:25+08:00
modified: 2025-08-22T15:27:25+08:00
title: Example Document Title
subject: keyword1, keyword2, keyword3
tags: [tag1, tag2]
---
```

## Naming Conventions

### File Names
- Use descriptive, Obsidian-friendly names allowing spaces
- **Primary literature**: `Author Surname - Year - Short Title.md`
- **Annotations**: `Author Surname - Year - Short Title - Annotation.md` or `<BibKey> - Annotation.md`
- **Appendices**: `Appendix - Descriptive Title.md`
- **Attachments**: Use original filenames in `Literature/Media/`

### Examples
- `Benoit Mandelbrot - 1982 - Fractal Geometry of Nature.md`
- `PKC System Architecture - Design Patterns.md`
- `Appendix - Petri Net Incidence Matrices and Invariants.md`

## Directory Placement Rules

### Content Types and Locations
- **`Permanent/`**: Long-lived knowledge, evergreen notes, projects
  - New references: `Permanent/Projects/<Project>/`
- **`Literature/`**: External annotations and references
  - `Literature/People/`: Person profiles
  - `Literature/Annotation/`: Source-bound reading notes
  - `Literature/Media/`: PDFs, images, attachments
- **`Fleeting/`**: Scratch notes, daily diaries, quick captures
- **`Hub/`**: Frameworks, theories, architectures, navigation
- **`Spaces/`**: Navigation, canvases, integration points
- **`SystemSculpt/`**: System-specific documentation
- **`z_Attachments/`**: General images, PDFs, assets

## Content Structure Guidelines

### Note Atomicity
- Express single ideas per note (evergreen principle)
- Include short summary near top when applicable
- Maintain focus on one core concept

### Seed Content Requirements
New files must include:
- Minimal definition of the concept
- At least one concrete example
- Minimum one backlink to existing content
- For appendices: definition + example + parent document link

### Stub File Protocol
When creating stubs:
- Start with header and skeleton structure
- Link from closest parent page
- Include TODO list inline or in separate `TODO.md`

## Linking Conventions

### Link Types
- **Prefer**: `[[Wiki Links]]` over raw file paths
- **Section links**: `[[File Name#Section]]` when referencing specific parts
- **Bidirectional**: Ensure backlinks for graph navigation

### Link Validation
- All Obsidian links must resolve to existing notes
- Section anchors must be correct
- Unresolved links should trigger stub creation
- Regular validation and cleanup required

## Content Formatting Rules

### LaTeX Integration
- **Inline math**: `$D = D^{+} - D^{-}$`
- **Block equations**: `$$x^{\top} D = 0$$`
- Ensure LaTeX compiles in preview mode
- Use consistent mathematical notation

### Diagram Standards
- **Prefer Mermaid syntax** for technical diagrams
- Each diagram conveys one core message
- Place near explanatory text
- Include caption: "Diagram: [description]"
- Validate Mermaid blocks compile in preview

### Code Blocks
- Use appropriate language tags
- Include context and explanation
- Follow consistent formatting standards

## PKC/CLM Specific Rules

### Conceptual Hierarchy
- **Polynomial-first framing**: Explain from Container/Polynomial semantics first
- **Derive operational views**: Place–Transition Workflow, Petri Nets second
- **A/B/C Alignment**: Abstract Spec → Balanced Expectations → Concrete Implementation

### Terminology Standards
- **"Place–Transition Workflow"**: For runtime idioms
- **"Petri Net"**: For analysis and formalism
- Define terms once per document
- Maintain consistency across related documents
- Cross-link to `[[.windsurf/rules/CLM.md]]` when relevant

### Mathematical Approach
- Prefer invariants and counts over prose claims
- Reference appendices for property assertions
- Use formal notation consistently

## References and Bibliography

### Reference Sections
- Include `# References` section at document end
- Cite external sources using consistent format
- Use Dataview blocks filtered by subject/entity
- Link to relevant literature notes

### Citation Format
- Academic sources: Standard citation format
- Internal references: Wiki links with context
- External links: Full URLs with access dates

## Quality Assurance

### Pre-Publication Checklist
- [ ] Frontmatter complete with all required fields
- [ ] Title matches H1 heading
- [ ] At least one backlink from existing content
- [ ] All internal links resolve correctly
- [ ] LaTeX and Mermaid syntax validated
- [ ] Appropriate directory placement
- [ ] Terminology consistent with project standards
- [ ] References section included if applicable

### Automated Suggestions
LLMs may auto-suggest:
- `## Related` sections based on strong internal links
- Cross-references to appendices and methods
- Connections to relevant Hub/Spaces content
- Dataview code blocks (properly fenced and closed)

## Integration with Development

### Code Documentation
- Document complex logic with clear comments
- Follow rules in `.windsurf/rules/` for technical implementation
- Maintain separation between knowledge and application code
- Use environment variables for configuration

### Version Control
- Small, atomic commits with descriptive messages
- Update documentation alongside code changes
- Maintain consistency between docs and implementation

## References

See [[Agents]] for agent workflow guidelines and [[PRD]] for overall project requirements.

This document ensures consistent, high-quality content generation that integrates seamlessly with the Obsidian-based PKC knowledge management system.
