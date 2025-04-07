# mcp-pandoc-ts: A Document Conversion MCP Server (TypeScript/Host Service Version)

**⚠️ Status: Preview Release ⚠️**

This is an initial release. While core functionality (Markdown, HTML, PDF, DOCX, TXT conversion) has been tested, other formats like **LaTeX and EPUB are currently untested**. Please report any issues.

This project provides document conversion capabilities via the Model Context Protocol (MCP). It uses a **two-component architecture**:

1.  **`mcp-pandoc-ts` (This Directory):** A TypeScript-based MCP server designed to run inside a container (e.g., within LibreChat). It receives MCP requests via stdio.
2.  **`pandoc-host-service` (Separate Directory):** A Python Flask service designed to run on the **host machine**. It listens for HTTP requests from the container service and executes the host's `pandoc` command.

This architecture allows leveraging a `pandoc` installation on the host machine without needing to install it inside the container.



## Prerequisites

**For the Host Machine (running `pandoc-host-service`):**

1.  **Python:** Version 3.7+ recommended.
2.  **pip:** Python package installer.
3.  **Pandoc:** The core conversion tool. Must be installed and accessible in your system's PATH. See [pandoc installation instructions](https://pandoc.org/installing.html).
4.  **TeX Live / MiKTeX (for PDF output):** Required *only* if you need to convert documents to PDF format via the host service.
    *   **Ubuntu/Debian:** `sudo apt-get install texlive-xetex`
    *   **macOS:** `brew install texlive`
    *   **Windows:** Install [MiKTeX](https://miktex.org/) or [TeX Live](https://tug.org/texlive/).

**For the Container Environment (running `mcp-pandoc-ts`):**

1.  **Node.js:** Version 16 or later recommended.
2.  **npm** or **yarn:** Package manager for Node.js.
3.  Network connectivity to the host machine where `pandoc-host-service` is running.
4.  **Host Service URL Configuration (CRITICAL):** This server **must** know the URL of the running `pandoc-host-service`. This is configured via the `PANDOC_HOST_URL` environment variable.
    *   **Deployment (e.g., LibreChat, Docker Compose):** **Set the `PANDOC_HOST_URL` environment variable directly in your deployment configuration.** This is the **recommended and most reliable method** for deployed environments. See the "MCP Integration" section for an example. This method overrides any `.env` file.
    *   **Local Development/Testing:** For convenience during local development *only*, you can create a `.env` file in the project root (copy `.env.example` to `.env`) and set the `PANDOC_HOST_URL` there. The server will load this value if no external environment variable is set.
    *   **Value Examples:**
        *   Docker Desktop (Mac/Win): `http://host.docker.internal:5001`
        *   Linux (typical bridge network): `http://172.17.0.1:5001` (Verify host IP on Docker network)
    *   **Failure to configure this variable** (either externally or via `.env` for local testing) will prevent the server from contacting the host service and result in errors.

## Setup and Running

**Step 1: Set up and Run the Host Service (`pandoc-host-service`)**

1.  Navigate to the `pandoc-host-service` directory (sibling to `mcp-pandoc-ts`) on your **host machine**.
2.  (Recommended) Create and activate a Python virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the Host Service using Waitress:**
    *   Open a **new, separate terminal window** on your host machine.
    *   Ensure you are still inside the `pandoc-host-service` directory and that your virtual environment (if created) is active.
    *   Make the run script executable (if you haven't already): `chmod +x run_host_service.sh`
    *   Execute the run script:
        ```bash
        ./run_host_service.sh
        ```
    *   You should see output from Waitress indicating it's serving the app (e.g., `Serving on http://0.0.0.0:5001`). The Flask development server warnings should **not** appear.
    *   **Important:** This terminal window **must remain open** for the host service to keep running and handle requests from the `mcp-pandoc-ts` container service. If you close this terminal, the host service stops.
    *   **(Optional - Advanced):** For a more permanent setup where the service runs even after closing the terminal, consider using tools like `nohup` (`nohup python app.py &amp;`), `screen`, or `tmux`, or setting it up as a system service.

**Step 2: Set up and Run the Container Service (`mcp-pandoc-ts`)**

1.  Navigate to the `mcp-pandoc-ts` directory (this directory).
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  Compile the TypeScript code:
    ```bash
    npm run build
    # or
    yarn build
    ```
    This creates the `dist/server.js` file.
4.  **Configure Host Service URL:** Ensure `PANDOC_HOST_URL` is configured using one of the methods described in the "Prerequisites" section (either create and edit a `.env` file or set the environment variable externally).
5.  Run the MCP server (e.g., via LibreChat configuration or directly):
    ```bash
    # The server will load PANDOC_HOST_URL from .env or the external environment
    npm start
    # or
    yarn start
    # or directly
    node dist/server.js
    ```
    This server will listen on stdin for MCP requests and forward conversion tasks to the host service using the configured `PANDOC_HOST_URL`. If the variable is not configured (via `.env` or external environment), the server will log an error and fail to process requests.

## MCP Integration (Example for LibreChat)

Configure your MCP client (LibreChat, or similar) to launch the `mcp-pandoc-ts` server using Node.js. **The recommended and most reliable way to configure the connection is by setting the `PANDOC_HOST_URL` environment variable directly within the MCP client's configuration for this server.** This ensures the setting is correctly applied in the deployment environment.

Example configuration snippet (adapt path as needed):

```json
{
  "mcpServers": {
    "mcp-pandoc-ts": {
      "command": "node",
      "args": ["/path/to/your/mcp-pandoc-ts/dist/server.js"],
      "env": {
        "PANDOC_HOST_URL": "http://host.docker.internal:5001" // <-- SET THIS TO THE CORRECT URL FOR YOUR ENVIRONMENT
      }
    }
  }
}
```

## Tools

### `convert-contents`

*   **Description:** Converts content between different formats by sending requests to the host Pandoc service.
*   **🚨 CRITICAL REQUIREMENTS:**
    *   The `pandoc-host-service` must be running on the host machine.
    *   The `PANDOC_HOST_URL` must be correctly configured (via `.env` file or external environment variable) when launching this server, pointing to the running `pandoc-host-service`.
    *   Host machine requires Pandoc (and TeX Live for PDF).
*   **Current Limitations:**
    *   Only `contents` input is supported. `input_file` is **not** currently handled due to path complexities between container and host.
    *   `output_file` is supported for all output formats. For binary formats (like `pdf`, `docx`), the host service sends the file content encoded in base64, and this container service decodes and saves it to the specified path. For text formats, the plain text is saved.
*   **Supported Formats (via host):** `markdown`, `html`, `pdf`, `docx`, `rst`, `latex` (Untested), `epub` (Untested), `txt`
*   **Input Schema:**
    *   `contents` (string): Content to convert (**required**).
    *   `input_file` (string): **NOT CURRENTLY SUPPORTED.**
    *   `input_format` (string, optional, default: `markdown`): Source format.
    *   `output_format` (string, optional, default: `markdown`): Target format.
    *   `output_file` (string, optional): Absolute path *within the container* to save output. Only functional for basic formats (`txt`, `html`, `markdown` `pdf` `docx` etc.)

## Development

*   **Container Service:** Source code is in `mcp-pandoc-ts/src`. Run `npm run build` to compile.
*   **Host Service:** Source code is in `pandoc-host-service`. Run `python app.py` to start.