# Active Context

  This file tracks the project's current status, including recent changes, current goals, and open questions.
  2025-04-07 06:51:34 - Log of updates made.
  2025-04-07 06:56:25 - Updated after planning phase completion.
  2025-04-07 07:03:22 - Updated after initial TS implementation.
  2025-04-07 07:34:56 - Updated after architectural pivot to host-service model.
  2025-04-07 09:20:24 - Updated after successful initialization debugging.
  2025-04-07 14:07:21 - Updated after implementing PDF/file output support.

*

## Current Focus

*   Clean up Git history to establish the current state as the new baseline for the `main` branch.

## Recent Changes

*   [2025-04-07 06:51:24] Initialized the Memory Bank.
*   ... (previous entries) ...
*   [2025-04-07 09:19:57] Confirmed successful initialization of `mcp-pandoc-ts` server in LibreChat.
*   [2025-04-07 13:31:57] Implemented file output handling (PDF etc.) in `pandoc-host-service` (generates temp file, returns base64 content).
*   [2025-04-07 13:32:19] Updated `mcp-pandoc-ts` to receive base64 content, decode it, and save to specified `output_file` in container.
*   [2025-04-07 14:06:54] Confirmed PDF conversion and file saving works correctly end-to-end.
*   [2025-04-07 14:07:15] Updated Memory Bank (`progress.md`).
*   [2025-04-07 15:04:00] [Architect/Code] Decided to treat the TS rewrite as a new Git baseline, replacing the old `main` branch history. Updated `decisionLog.md`.

## Architectural Notes / Limitations

*   The system relies on two components: `mcp-pandoc-ts` (container) and `pandoc-host-service` (host). Both must be running.
*   Communication is via HTTP from container to host (`host.docker.internal:5001`).
*   File-based output formats (PDF, DOCX, etc.) are supported by generating the file on the host, transferring content via base64, and saving within the container if `output_file` is specified.
*   `input_file` parameter is currently **not supported** due to host/container path complexities. Only `contents` input works.

## Open Questions/Issues

*   (Resolved) Integration with LibreChat: Confirmed as launching compiled JS with `node` and using stdio via MCP SDK.
*   (Resolved) Preferred Libraries: Now using MCP SDK.
*   (Resolved) Functionality Scope: Confirmed as replicating existing Python server functionality (now via host service, including file output).