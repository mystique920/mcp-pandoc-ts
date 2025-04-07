# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.
2025-04-07 06:51:24 - Log of updates made will be appended as footnotes to the end of this file.

*

## Project Goal

*   Rewrite the existing Python `mcp-pandoc` server into TypeScript for potential integration with LibreChat's Node.js environment.

## Key Features

*   Provide MCP tools for document conversion using Pandoc.
*   Accept document content or file paths as input.
*   Specify input and output formats.
*   (Potentially) Integrate with LibreChat startup process.

## Overall Architecture

*   Current: Python MCP server using `uvicorn` and `fastapi`.
*   Implemented: Two-component system - TypeScript MCP server (`mcp-pandoc-ts`) running in container, communicating via HTTP with a Python Flask service (`pandoc-host-service`) running on the host to access the host's `pandoc`.