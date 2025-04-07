# System Patterns *Optional*

This file documents recurring patterns and standards used in the project.
It is optional, but recommended to be updated as the project evolves.
2025-04-07 06:51:56 - Log of updates made.

*

## Coding Patterns

*   (To be defined for TypeScript rewrite)

## Architectural Patterns

*   Current: Python MCP Server (FastAPI/Uvicorn)
*   Implemented: Two-Component System
    *   Container: Node.js/TypeScript MCP Server (`mcp-pandoc-ts`) handling MCP communication via stdio.
    *   Host: Python/Flask HTTP Service (`pandoc-host-service`) wrapping the host's `pandoc` executable.
    *   Communication: Container calls Host service via HTTP (`host.docker.internal:5001`).

## Testing Patterns

*   (To be defined for TypeScript rewrite)