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

## Decision

*   [2025-04-07 15:04:00] Treat the TypeScript rewrite as a new project baseline in Git, detaching the `main` branch history from the original Python-only version.

## Rationale

*   The project structure and core language have completely changed (Python -> TypeScript + Python Host Service).
*   The user explicitly stated the desire to not link the new version to the old one in Git history.
*   Merging the branch with deleted files into the old `main` would retain irrelevant history. Replacing `main` provides a cleaner starting point for the new project structure.

## Implementation Details

*   Commit the deletion of old Python files on the current feature branch.
*   Force-rename the feature branch to `main` locally (`git branch -M main`).
*   Force-push the new `main` branch to the remote repository (`git push origin main --force`), overwriting the previous `main` history. This requires caution.

## Decision

*   [2025-04-07 15:14:00] Use an environment variable (`PANDOC_HOST_URL`) to configure the Python host service address for cross-platform compatibility.

## Rationale

*   Hardcoding host addresses (`host.docker.internal`, `172.17.0.1`) is unreliable across different Docker setups (Docker Desktop vs. native Linux Docker).
*   Environment variables allow the deployment environment (e.g., Docker Compose, Kubernetes, script) to provide the correct host address from the container's perspective.
*   This makes the application code portable and delegates platform-specific configuration to the deployment layer.

## Implementation Details

*   Modify `src/server.ts` to read `process.env.PANDOC_HOST_URL`.
*   If the variable is set, use its value.
*   If the variable is *not* set, the server should log an error and potentially fail to start or handle requests, as the host service URL is required. No default value will be used.
*   Update `README.md` to document the `PANDOC_HOST_URL` variable, the default behavior, and provide guidance for setting it in different environments (especially Linux).