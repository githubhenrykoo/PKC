---
created: 2025-08-22T15:27:25+08:00
modified: 2025-08-22T15:27:25+08:00
title: Agents Guide - Operating Rules for This Obsidian-Based Project
subject: agents, obsidian, workflow, governance, PKC
---

# Agents Guide: Operating Rules for This Obsidian-Based Project

This document codifies how agents (human or AI) should work within the Obsidian vault to keep edits coherent, auditable, and easy to build upon. It outlines workflow, technical conventions, and quality checks.

## Agent Types and Roles

### Trader Agents
- Focus on external interactions and resource acquisition
- Manage literature imports and external references
- Handle API integrations and data sourcing
- Place work in `Literature/` hierarchy

### Miner Agents
- Extract patterns and insights from existing knowledge
- Create connections between disparate concepts
- Generate derived knowledge and appendices
- Work primarily in `Permanent/` and `Hub/`

### Coder Agents
- Implement technical solutions and systems
- Maintain code quality and documentation
- Follow development best practices
- Coordinate with `src/` codebase and technical docs

## Workflow Conventions

### File Operations
1. **Before Creating**: Check if similar content exists using Obsidian search
2. **Naming**: Use descriptive, space-allowed names following PRD guidelines
3. **Placement**: Follow directory structure defined in [[PRD]]
4. **Linking**: Add at least one backlink from parent/related notes

### Edit Protocol
1. **Small, Atomic Changes**: One concept per edit session
2. **Frontmatter Updates**: Always update `modified` timestamp on meaningful edits
3. **Link Validation**: Ensure all `[[Wiki Links]]` resolve correctly
4. **Preview Check**: Validate LaTeX and Mermaid syntax before saving

### Quality Checks
- [ ] Frontmatter complete with required fields
- [ ] At least one backlink from existing content
- [ ] Links resolve to existing notes or planned stubs
- [ ] LaTeX equations render correctly
- [ ] Mermaid diagrams compile in preview
- [ ] References section included where applicable

## Technical Conventions

### Markdown Standards
- Use `[[Wiki Links]]` over file paths
- Include section anchors: `[[File#Section]]`
- LaTeX inline: `$equation$`, block: `$$equation$$`
- Mermaid blocks properly fenced with language tag

### Version Control
- Small, focused commits with descriptive messages
- Use `git pull --rebase` to maintain linear history
- Review changes with `git diff --staged` before commit
- Feature branches: `feat/topic-short` for larger work

### Code Integration
- Follow rules in `.windsurf/rules/` for technical implementation
- Maintain separation between knowledge content and application code
- Use environment variables for sensitive configuration
- Document complex logic with clear comments

## Audit Trail Requirements

### Change Documentation
- Update `modified` timestamp on every meaningful edit
- Include brief change description in commit messages
- Maintain bidirectional links for traceability
- Use consistent terminology across related documents

### Graph Cohesion
- Ensure new content integrates with existing knowledge graph
- Add cross-references to relevant concepts and methods
- Create hub pages for complex topic areas
- Regular link validation and cleanup

## Error Prevention

### Common Pitfalls
- Creating orphaned notes without backlinks
- Inconsistent terminology usage
- Broken internal links
- Missing or incomplete frontmatter
- Large, unfocused commits

### Validation Checklist
Before finalizing any edit:
- [ ] Frontmatter fields complete
- [ ] Links resolve correctly
- [ ] Content follows atomic principle
- [ ] At least one bidirectional connection
- [ ] Appropriate directory placement
- [ ] Change committed with clear message

## References

See [[PRD]] for detailed project requirements and [[rules]] for LLM-specific content generation guidelines.

This guide ensures consistent, auditable, and buildable knowledge management across all agent interactions with the Obsidian vault.
