import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool, // Import Tool type from SDK
    TextContent, // Import TextContent type from SDK
} from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// --- Server Definition ---
const serverInfo = {
    name: "mcp-pandoc-ts", // Match package.json
    version: "0.1.0"      // Match package.json
};
// --- Tool Definition ---
// Define the tool *before* using it in Server constructor
const convertContentsTool: Tool = {
    name: "convert-contents",
    description: (
        "Converts content between different formats using Pandoc. Transforms input content or file " +
        "into the specified output format.\n\n" +
        "🚨 CRITICAL REQUIREMENTS - PLEASE READ:\n" +
        "1. Host Service: The separate 'pandoc-host-service' MUST be running on the host machine.\n" +
        "2. Pandoc Installation (on Host): Pandoc MUST be installed and accessible in the host's PATH.\n" +
        "3. PDF Conversion (on Host): TeX Live (or MiKTeX on Windows) MUST be installed on the host for PDF output.\n" +
        "4. File Paths: Provide COMPLETE absolute paths for 'output_file' if used (must be paths accessible *within this container*).\n\n" +
        "Supported formats: markdown, html, pdf, docx, rst, latex, epub, txt\n\n" +
        "⚠️ Current Limitations: 'input_file' is NOT supported. 'output_file' only works for basic text formats (md, html, txt)."
    ),
    inputSchema: {
        type: "object",
        properties: {
            contents: {
                type: "string",
                description: "The content to be converted (required, input_file not supported)"
            },
            input_file: {
                type: "string",
                description: "NOT SUPPORTED. Use 'contents' instead."
            },
            input_format: {
                type: "string",
                description: "Source format of the content (defaults to markdown)",
                default: "markdown",
                enum: ["markdown", "html", "pdf", "docx", "rst", "latex", "epub", "txt"]
            },
            output_format: {
                type: "string",
                description: "Desired output format (defaults to markdown)",
                default: "markdown",
                enum: ["markdown", "html", "pdf", "docx", "rst", "latex", "epub", "txt"]
            },
            output_file: {
                type: "string",
                description: "Complete absolute path *within the container* where to save the output (only supported for basic formats like md, html, txt)"
            }
        },
        required: ["contents"] // Enforce contents only for now
        // Removed oneOf and input_file requirement
    }
};


const server = new Server(
    serverInfo,
    { // Pass initial capabilities during server instantiation
        capabilities: {
            resources: {},
            tools: {
                "convert-contents": convertContentsTool
            }
        }
    }
);


// --- Request Handlers ---

// Handle ListTools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
    // console.error("[Handler] Received ListTools request."); // Removed log
    return {
        // SDK expects the tools object directly, LC error indicates it wants an array here
        tools: [ convertContentsTool ] // Return tools as an ARRAY
    };
});

// Handle CallTool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // console.error(`[Handler] Received CallTool request for tool: ${name}`); // Removed log

    // --- Get Mandatory Host Service URL ---
    const hostServiceUrl = process.env.PANDOC_HOST_URL;
    if (!hostServiceUrl) {
        console.error("[CallTool] CRITICAL ERROR: PANDOC_HOST_URL environment variable is not set.");
        throw new Error("Configuration Error: The required PANDOC_HOST_URL environment variable is not set. Cannot connect to the host Pandoc service.");
    }

    if (name !== convertContentsTool.name) {
        // SDK handles unknown tool errors, but good practice to check
        throw new Error(`Tool not found: ${name}`); // Throw standard Error
    }

    // --- Argument Validation (Simplified as schema should handle some) ---
    // Schema now requires 'contents', so we primarily validate formats and output_file logic
    if (!args) {
        throw new Error("Missing arguments for tool call.");
    }
    // Use type assertion to access properties safely
    const contents = (args as Record<string, any>).contents as string;
    const output_file = (args as Record<string, any>).output_file as string | undefined; // output_file is optional
    const output_format = ((args as Record<string, any>).output_format as string || 'markdown').toLowerCase();
    const input_format = ((args as Record<string, any>).input_format as string || 'markdown').toLowerCase();

    // Add explicit check for contents after assertion
    if (typeof contents !== 'string') {
         throw new Error("Invalid or missing 'contents' argument.");
    }

    const SUPPORTED_FORMATS = ["markdown", "html", "pdf", "docx", "rst", "latex", "epub", "txt"];
    const ADVANCED_FORMATS = ["pdf", "docx", "rst", "latex", "epub"]; // Formats host service returns error for

    // Basic format validation (SDK might do this based on schema enums too)
    if (!SUPPORTED_FORMATS.includes(input_format)) {
         throw new Error(`Invalid input_format '${input_format}'. Supported: ${SUPPORTED_FORMATS.join(', ')}`); // Throw standard Error
    }
    if (!SUPPORTED_FORMATS.includes(output_format)) {
         throw new Error(`Invalid output_format '${output_format}'. Supported: ${SUPPORTED_FORMATS.join(', ')}`); // Throw standard Error
    }

    // --- Call Host Pandoc Service ---
    // const hostServiceUrl = 'http://host.docker.internal:5001/convert'; // Replaced by environment variable
    const payload = {
        contents: contents,
        input_format: input_format,
        output_format: output_format
    };

    // console.error(`[CallTool] Calling host Pandoc service at ${hostServiceUrl} with payload:`, payload); // Removed log

    try {
        const response = await axios.post(hostServiceUrl, payload, { timeout: 30000, responseType: 'json' }); // Explicitly expect JSON
        // console.error('[CallTool] Received response from host service:', response.data); // Removed log
            // Removed detailed response data logging block


        if (response.status === 200) {
            let resultMessage = "";
            let fileSaved = false;

            // Check for base64 encoded file content first
            if (response.data?.file_content_base64) {
                if (output_file) {
                    try {
                        // console.error(`[CallTool] Received base64 content for ${response.data.output_format}. Decoding and writing to: ${output_file}`); // Removed log
                        const decodedContent = Buffer.from(response.data.file_content_base64, 'base64');

                        // Ensure directory exists before writing
                        const outputDir = path.dirname(output_file);
                        if (!fs.existsSync(outputDir)) {
                            fs.mkdirSync(outputDir, { recursive: true });
                            // console.error(`[CallTool] Created output directory: ${outputDir}`); // Removed log
                        }

                        fs.writeFileSync(output_file, decodedContent);
                        // console.error(`[CallTool] Successfully wrote decoded content to container path: ${output_file}`); // Removed log
                        resultMessage = `Content successfully converted to ${response.data.output_format || output_format} and saved to: ${output_file}`; // Ensure message is set
                        fileSaved = true;
                    } catch (writeErr: any) {
                        console.error(`[CallTool] Failed to decode/write base64 content to output_file '${output_file}': ${writeErr.message}`);
                        throw new Error(`Conversion via host succeeded, but failed to decode/write file '${output_file}' in container: ${writeErr.message}`);
                    }
                } else {
                    // Received binary content but no output file specified
                    console.error(`[CallTool] Error: Received file content from host, but no output_file was specified in the request.`);
                    throw new Error(`Conversion to ${response.data.output_format} succeeded on host, but 'output_file' was not specified to save the result.`);
                }
            }
            // Check for plain text content
            else if (response.data?.converted_content) {
                resultMessage = response.data.converted_content; // Assign raw text content
                if (output_file) {
                     // Handle saving plain text formats if output_file was requested
                     try {
                        // Ensure directory exists before writing
                        const outputDir = path.dirname(output_file);
                        if (!fs.existsSync(outputDir)) {
                            fs.mkdirSync(outputDir, { recursive: true });
                            // console.error(`[CallTool] Created output directory: ${outputDir}`); // Already removed
                        }
                        fs.writeFileSync(output_file, resultMessage); // Write the plain text
                        // console.error(`[CallTool] Successfully wrote text content to container path: ${output_file}`); // Already removed
                        resultMessage = `Content successfully converted and saved to: ${output_file}`; // Update message
                        fileSaved = true;
                     } catch (writeErr: any) {
                         console.error(`[CallTool] Failed to write text content to output_file '${output_file}': ${writeErr.message}`);
                         throw new Error(`Conversion via host succeeded, but failed to write to output file '${output_file}' in container: ${writeErr.message}`);
                     }
                }
                 // If no output_file for plain text, resultMessage already holds the content
            }
            // If neither file nor text content received, something is wrong
            else if (!fileSaved && !resultMessage) {
                 // Keep this critical error log
                 console.error(`[CallTool] Host service responded with status 200 but no usable content (file_content_base64 or converted_content). Response data:`, response.data);
                 throw new Error(`Host service responded successfully but provided no usable content.`);
            }

            // Construct final response for LibreChat
            // console.error(`[CallTool] Preparing final response. fileSaved=${fileSaved}, resultMessage='${resultMessage}'`); // Already removed
            const responseContent: TextContent[] = [{ type: 'text', text: resultMessage }];
            return { content: responseContent }; // Use 'content' (singular) key

        } else { // Handle non-200 responses from host service
            // Handle errors reported by the host service
             const errorMessage = response.data?.error || `Host service responded with status ${response.status} but no converted content.`;
             // Keep this critical error log
             console.error(`[CallTool] Error from host service (Status ${response.status}): ${errorMessage}`);
             throw new Error(`Host Pandoc service error: ${errorMessage}`); // Throw standard Error
        }

    } catch (error: any) {
        // Keep this critical error log
        console.error('[CallTool] Error calling host Pandoc service:', error);
        let errorMessage = `Failed to call host Pandoc service: ${error.message}`;
        let errorCode = -32000; // Default server error
        if (axios.isAxiosError(error)) {
            if (error.response) {
                errorMessage = `Host Pandoc service returned error status ${error.response.status}: ${error.response.data?.error || error.message}`;
            } else if (error.request) {
                errorMessage = `No response received from host Pandoc service at ${hostServiceUrl}. Is it running and is PANDOC_HOST_URL correct?`;
            } else if (error.code === 'ECONNREFUSED') {
                 errorMessage = `Connection refused by host Pandoc service at ${hostServiceUrl}. Is it running and is PANDOC_HOST_URL correct?`;
            } else if (error.code === 'ETIMEDOUT') {
                 errorMessage = `Connection timed out to host Pandoc service at ${hostServiceUrl}. Is PANDOC_HOST_URL correct?`;
                 errorCode = -32001; // Specific timeout code
            }
        }
        // Throw error for SDK to handle
        throw new Error(errorMessage); // Throw standard Error
    }
});

// --- Main Execution ---
async function main() {
  console.error(`[Main] Starting ${serverInfo.name} v${serverInfo.version}...`);
  const transport = new StdioServerTransport();
  // The connect method starts listening and handling requests via the transport
  await server.connect(transport);
  console.error("[Main] Server connection established via stdio transport. Waiting for requests...");
}

// console.error('[Script] Initializing main function call...'); // Removed log
main().catch((error) => {
  console.error("[Main Catch] Fatal error during server execution:", error);
  process.exit(1);
});