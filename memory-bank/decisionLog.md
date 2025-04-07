# Decision Log

This file records architectural and implementation decisions using a list format.
2025-04-07 06:51:49 - Log of updates made.
2025-04-07 07:33:16 - Added decision regarding host-service architecture.

*

## Decision

*   [2025-04-07 06:51:24] Initialize and use Memory Bank for this project.

## Rationale

*   Maintain context for a potentially complex rewrite task.
*   Track progress, decisions, and evolving requirements.
*   Facilitate collaboration between different modes if needed later.

## Implementation Details

*   Created `memory-bank/` directory.
*   Created `productContext.md`, `activeContext.md`, `progress.md`, `decisionLog.md`, `systemPatterns.md`.

## Decision

*   [2025-04-07 06:55:17] Proceed with rewriting the `mcp-pandoc` server from Python to TypeScript.

## Rationale

*   Goal is potential integration with LibreChat's Node.js environment.
*   Leverage TypeScript's static typing benefits.
*   ~~Plan involves using standard Node.js modules (`child_process`, `process.stdin/stdout`) and replicating existing functionality.~~ (Superseded by host-service decision)

## Implementation Details

*   Detailed plan saved in `PLAN_typescript_rewrite.md`.
*   Next step is to switch to Code mode for implementation.

## Decision

*   [2025-04-07 07:27:26] Adopt a two-component architecture: TypeScript MCP server (in container) calling a separate Python Flask service (on host) via HTTP to execute Pandoc.

## Rationale

*   The `mcp-pandoc-ts` server runs inside a Docker container (LibreChat environment) where `pandoc` is not installed.
*   Installing `pandoc` and `TeX Live` in the container image was deemed less desirable than leveraging the host's installation.
*   Direct execution of host commands from the container is not feasible/secure.
*   The host service provides an interface (`/convert`) for the container service to access the host's `pandoc`.

## Implementation Details

*   Created host service directory: `pandoc-host-service`.
*   Created host service files: `requirements.txt`, `app.py` (using Flask, pypandoc).
*   Modified `mcp-pandoc-ts/src/server.ts` to remove `child_process` logic and add `axios` calls to `http://host.docker.internal:5001/convert`.
*   Updated `mcp-pandoc-ts/README.md` to reflect the new architecture and setup instructions.
*   Current limitations: Host service primarily handles `contents` input; `input_file`/`output_file` handling across boundaries is restricted.