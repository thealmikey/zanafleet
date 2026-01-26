# MCP Verification Prompt Template

Use this template when scaffolding code that depends on external libraries.

## Pre-Generation Checklist

Before generating code, execute these MCP verification steps:

### 1. Identify Dependencies

List all external libraries your code will use:
- [ ] NestJS modules (`@nestjs/*`)
- [ ] TypeORM (`typeorm`, `@nestjs/typeorm`)
- [ ] Neo4j (`neo4j-driver`, internal `src/core/neo4j` module)
- [ ] Validation (`zod`, `class-validator`)
- [ ] Other: _________________

### 2. Context7 Verification

For each dependency, run:

```
Tool: resolve-library-id
Arguments: { libraryName: "<package-name>" }

Tool: query-docs
Arguments: { 
  libraryId: "<resolved-id>",
  topic: "<specific-feature-or-api>"
}
```

### 3. DeepWiki Project Context

Check project-specific patterns:

```
Tool: read_wiki_structure
Arguments: { repository: "zanafleet/zanafleet" }

Tool: read_wiki_contents
Arguments: { 
  repository: "zanafleet/zanafleet",
  path: "<relevant-topic>"
}
```

### 4. Version Cross-Reference

Compare retrieved documentation against `DEPENDENCIES.md`:
- Pinned version: `<version-from-dependencies>`
- Context7 version: `<version-from-query>`
- Compatible: Yes / No / Needs Investigation

### 5. Generate Code

Only after completing steps 1-4, proceed with code generation following:
- Event-driven patterns from AGENTS.md
- Naming conventions from AGENTS.md §2
- Testing requirements from CONTRIBUTING.md

## Example Usage

**Task**: Create a new NestJS command handler

**MCP Verification**:
```
1. resolve-library-id({ libraryName: "@nestjs/cqrs" })
   → Result: /nestjs/cqrs

2. query-docs({ 
     libraryId: "/nestjs/cqrs", 
     topic: "CommandHandler decorator"
   })
   → Result: Current API shows @CommandHandler(Command) decorator pattern

3. Cross-reference DEPENDENCIES.md: @nestjs/cqrs ^10.0.0 ✓

4. Proceed with generation using verified patterns
```
