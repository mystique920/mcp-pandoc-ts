# Active Context

  This file tracks the project's current status, including recent changes, current goals, and open questions.
  2025-04-07 06:51:34 - Log of updates made.
  2025-04-07 06:56:25 - Updated after planning phase completion.
  2025-04-07 07:03:22 - Updated after initial TS implementation.
  2025-04-07 07:34:56 - Updated after architectural pivot to host-service model.
  2025-04-07 09:20:24 - Updated after successful initialization debugging.

*

## Current Focus

*   Attempt task completion.

## Recent Changes

*   [2025-04-07 06:51:24] Initialized the Memory Bank.
*   ... (previous entries) ...
*   [2025-04-07 07:34:53] Updated Memory Bank (`decisionLog.md`, `progress.md`).
*   [2025-04-07 09:11:52] Refactored `mcp-pandoc-ts` to use `@modelcontextprotocol/sdk`.
*   [2025-04-07 09:18:11] Debugged SDK implementation (fixed `initialize` and `tools/list` response formats).
*   [2025-04-07 09:19:57] Confirmed successful initialization of `mcp-pandoc-ts` server in LibreChat.
*   [2025-04-07 09:20:20] Updated Memory Bank (`progress.md`).

## Architectural Notes / Limitations

*   The system now relies on two components: `mcp-pandoc-ts` (container) and `pandoc-host-service` (host). Both must be running.
*   Communication is via HTTP from container to host (`host.docker.internal:5001`).
*   Current implementation primarily supports conversion via `contents` input. Handling `input_file` and `output_file` across the container/host boundary is limited/not fully supported due to path complexities.

## Open Questions/Issues

*   (Resolved) Integration with LibreChat: Confirmed as launching compiled JS with `node` and using stdio via MCP SDK.
*   (Resolved) Preferred Libraries: Now using MCP SDK.
*   (Resolved) Functionality Scope: Confirmed as replicating existing Python server functionality (now via host service).