# Plan: Rewriting mcp-pandoc Server in TypeScript

This document outlines the plan for rewriting the existing Python `mcp-pandoc` server into TypeScript for integration with LibreChat via Node.js and stdio.

**1. Project Setup & Dependencies:**

*   Initialize a new Node.js project using `npm` or `yarn`.
*   Set up TypeScript compilation (`tsconfig.json`).
*   Install necessary dependencies:
    *   `typescript`, `@types/node` (Core TypeScript support)
    *   Consider linting/formatting tools like `eslint` and `prettier` for code quality.
*   **MCP Communication:** Use Node.js's built-in `process.stdin` and `process.stdout` for stdio communication.
*   **Pandoc Interaction:** Use Node.js's `child_process` module (`spawn` or `exec`) to run the external `pandoc` command.

**2. Core Server Logic (`src/server.ts`):**

*   **MCP Communication:** Implement the main loop to read/write JSON messages via stdio, adhering to the Model Context Protocol.
*   **Tool Definition:** Define the `convert-contents` tool with its description, input schema, and validation rules, mirroring the Python version. Include prerequisites (TeX Live, file path requirements).
*   **Tool Handling (`handle_call_tool` function):**
    *   Receive tool name and arguments.
    *   Validate arguments (input source, formats, output path requirements, file existence).
    *   **Construct Pandoc Command:** Build the `pandoc` command line arguments dynamically based on inputs.
    *   **Execute Pandoc:** Use `child_process.spawn` to run `pandoc`, handling stdin/stdout/stderr appropriately.
    *   **Format Response:** Return MCP text messages (content or file path confirmation) or error messages.

**3. Packaging & Execution:**

*   Configure `package.json` with build (`tsc`) and run (`node dist/server.js`) scripts.
*   Ensure the compiled JavaScript (`dist/server.js` or similar) is the entry point for LibreChat.

**4. Documentation (`README.md` Update):**

*   Rewrite the README for the TypeScript version.
*   Include installation steps (Node.js, npm/yarn install).
*   Clearly state external dependencies (`pandoc`, `TeX Live` for PDF).
*   Provide updated usage examples and configuration details.

**High-Level Flow Diagram:**

```mermaid
graph TD
    A[MCP Client Request (e.g., LibreChat)] --> B(Node.js MCP Server);
    B -- Reads stdin --> C{Parse MCP Message};
    C -- type: list_tools --> D[Return Tool Definition];
    C -- type: call_tool --> E{Validate 'convert-contents' Args};
    E -- Valid --> F[Construct Pandoc Command];
    E -- Invalid --> G[Return Error Response];
    F --> H{Execute Pandoc (child_process)};
    H -- Success --> I{Format MCP Response (Text/File Path)};
    H -- Pandoc Error --> G;
    I -- Writes stdout --> A;
    G -- Writes stdout --> A;

    subgraph External Dependencies
        H -.-> J(Pandoc CLI);
        J -.-> K(TeX Live for PDF);
    end

    style G fill:#f9f,stroke:#333,stroke-width:2px
```

**Integration Notes:**

*   LibreChat will launch the compiled JavaScript file (e.g., `dist/server.js`) directly using `node`.
*   Communication will occur via standard input/output (stdio).

**Next Steps:**

*   Update Memory Bank with this plan.
*   Switch to Code mode to begin implementation.