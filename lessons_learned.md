# Lessons Learned: mcp-pandoc-ts Development & Debugging

This document summarizes the technical challenges encountered and lessons learned during the process of rewriting the Python `mcp-pandoc` server to TypeScript and integrating it with LibreChat.

## 1. Initial Goal & Approach

*   **Goal:** Rewrite the existing Python MCP server (using `pypandoc`) into TypeScript for potential better integration with LibreChat's Node.js environment.
*   **Initial Approach:** Manually implement the MCP server logic in TypeScript, handling stdio communication (`readline`, `process.stdout`), JSON parsing, message routing (`switch`), and calling the `pandoc` executable directly using Node.js `child_process`.

## 2. Challenge: Container vs. Host Dependencies

*   **Problem:** The initial approach assumed `pandoc` (and `TeX Live` for PDF) would be available in the environment where the TypeScript server runs. However, the server runs inside a Docker container (LibreChat) where these dependencies were not installed. Direct execution via `child_process` failed.
*   **Solution:** Architectural pivot to a **two-component system**:
    1.  **`mcp-pandoc-ts` (Container Service):** The TypeScript MCP server, modified to act as an HTTP client.
    2.  **`pandoc-host-service` (Host Service):** A new Python Flask service running on the host machine, exposing an HTTP endpoint (`/convert`) that wraps the host's `pandoc` installation.
    *   Communication occurs via HTTP from the container to the host (using `host.docker.internal`).
*   **Lesson:** Containerization requires careful consideration of external binary dependencies. Options include installing dependencies in the container image (standard Docker practice) or creating external services/APIs accessible from the container (adds complexity but leverages host resources). File path handling across container/host boundaries becomes a significant challenge with the service approach.

## 3. Challenge: MCP Initialization Failures (Timeout/Stall)

*   **Problem:** Despite the architectural change, the `mcp-pandoc-ts` server failed to initialize correctly within LibreChat, resulting in connection timeouts or stalling during startup, even though server-side logs often indicated successful execution. Other Node.js MCP servers worked correctly.
*   **Debugging Steps & Sub-Problems/Solutions:**
    *   **Initial Check:** Verified basic server structure, stdio reading/writing.
    *   **JSON-RPC `id` vs `request_id`:** Identified that the incoming requests used `"id"` while the server code initially expected `"request_id"`. Corrected interfaces and code references. (Still timed out).
    *   **Content-Length Framing vs. Newline-Delimited JSON:** Hypothesized that the client might expect specific message framing.
        *   Implemented Content-Length framing. (Still timed out).
        *   Reverted to simple newline-delimited JSON via `console.log`. (Still timed out).
        *   Reinstated Content-Length framing with detailed stream writability checks. Logs showed successful writes, but timeout persisted.
        *   **Final Framing Fix:** Reverted *back* to simple newline-delimited JSON (`console.log`), as this matches other working Node.js servers and is simpler.
    *   **JSON-RPC 2.0 Compliance (`"jsonrpc": "2.0"`):** Ensured all responses included the `"jsonrpc": "2.0"` field. (Still timed out).
    *   **Response Payload Key (`"result"` vs `"response"`):** Hypothesized client might expect `"response"` key instead of JSON-RPC 2.0's `"result"`. Reverted server to use `"response"`. (This finally allowed initialization to proceed further).
    *   **SDK Comparison:** Compared manual implementation with a working example using `@modelcontextprotocol/sdk`. Realized the SDK handles low-level protocol details automatically.
    *   **Refactoring to SDK:** Replaced manual stdio/JSON handling with the official SDK (`Server`, `StdioServerTransport`, `setRequestHandler`).
    *   **SDK `initialize` Capabilities Format:** Encountered SDK error "Server does not support tools". Fixed by passing initial capabilities (with `tools` as an *object map*) to the `Server` constructor.
    *   **SDK `tools/list` Response Format:** Encountered client error "Expected array, received object" for the `tools` property in the `tools/list` response. Fixed the `ListToolsRequestSchema` handler to return `tools` as an *array* within the `result` object. (Contradictory requirement compared to `initialize`).
    *   **Handling Subsequent Requests:** Added handlers for `notifications/initialized` (ignore) and `tools/list` (respond correctly) to prevent stalling after successful initialization. Ensured unsupported methods return a proper JSON-RPC error.
*   **Key Lessons:**
    *   **Use the SDK:** Manually implementing communication protocols like MCP over stdio is error-prone due to subtle requirements (framing, specific JSON structures, handshake nuances). Using the official SDK is highly recommended as it abstracts these complexities.
    *   **Client Expectations Vary:** Different clients (or different parts of the same client) might have slightly different expectations for message formats (e.g., `tools` as object vs. array in different contexts). Careful debugging and log analysis are crucial.
    *   **Stdio is Tricky:** Buffering, encoding, and framing issues can be hard to diagnose. Logging at multiple levels (process, stream, application) is essential.
    *   **Error Messages are Key:** The specific error messages from the client (like "Expected array, received object") were vital in pinpointing the final issues.

## 4. Final State

*   Two-component architecture (TS container server using SDK + Python host service).
*   Server initializes successfully in LibreChat.
*   Basic conversion via `contents` parameter works by proxying to the host service.
*   Limitations remain regarding `input_file` and `output_file` for advanced formats due to container/host path complexities.