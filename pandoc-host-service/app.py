import os
import tempfile
import shutil
import pypandoc
from flask import Flask, request, jsonify

app = Flask(__name__)

# Define a temporary directory for potential file operations
TEMP_DIR = tempfile.mkdtemp(prefix="pandoc_host_")

@app.route('/convert', methods=['POST'])
def handle_convert():
    """
    Handles document conversion requests.
    Expects JSON payload with:
    - contents (string): The text content to convert.
    - input_format (string): Format of the input content (e.g., 'markdown').
    - output_format (string): Desired output format (e.g., 'html').
    - (Optional) input_file: Path *within the container* - NOT SUPPORTED YET.
    - (Optional) output_file: Path *within the container* - NOT SUPPORTED YET.
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()

    contents = data.get('contents')
    input_format = data.get('input_format', 'markdown')
    output_format = data.get('output_format', 'markdown')
    # input_file = data.get('input_file') # Path relative to container - requires mapping/transfer
    # output_file = data.get('output_file') # Path relative to container - requires mapping/transfer

    # --- Input Validation ---
    if not contents:
        # For now, only supporting 'contents' input due to host/container path complexity
        return jsonify({"error": "Missing required field: 'contents'"}), 400

    if not input_format or not output_format:
        return jsonify({"error": "Missing required fields: 'input_format' or 'output_format'"}), 400

    app.logger.info(f"Received conversion request: input='{input_format}', output='{output_format}'")

    # --- Pandoc Execution (Placeholder) ---
    # TODO: Implement actual pandoc call using pypandoc
    # TODO: Handle temporary file creation/cleanup if needed for pypandoc
    # TODO: Add error handling for pandoc execution

    # Example using pypandoc.convert_text (needs error handling)
    try:
        # Prepare extra args if needed (e.g., for PDF)
        extra_args = []
        if output_format == 'pdf':
             extra_args.extend(['--pdf-engine=xelatex', '-V', 'geometry:margin=1in'])
             # Note: PDF output cannot be returned as string directly, would need file handling

        if output_format in ['pdf', 'docx', 'epub', 'rst', 'latex']: # Added missing advanced formats to check
             # This flow is complex because output_file is a container path.
             # Simplest for now: return error if file output requested but not implemented.
             app.logger.warning(f"Rejecting request for file-based output format: {output_format}")
             return jsonify({"error": f"Output format '{output_format}' requires file output, which is not fully supported in this host service setup yet."}), 501 # Not Implemented
        else:
            # Convert text to text format
            app.logger.info(f"Attempting text conversion: from='{input_format}' to='{output_format}' with extra_args={extra_args}")
            converted_output = pypandoc.convert_text(
                source=contents,
                to=output_format,
                format=input_format,
                extra_args=extra_args
            )
            app.logger.info(f"Text conversion successful. Output length: {len(converted_output)}")
            return jsonify({
                "message": "Conversion successful (via host service)",
                "converted_content": converted_output
            }), 200

    except Exception as e:
        # Catch potential pypandoc errors (pandoc not found, conversion failed, etc.)
        app.logger.error(f"Pandoc conversion failed: {e}")
        return jsonify({"error": f"Pandoc conversion failed: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    return jsonify({"status": "ok"}), 200

def cleanup():
    """Remove the temporary directory on shutdown."""
    if os.path.exists(TEMP_DIR):
        try:
            shutil.rmtree(TEMP_DIR)
            print(f"Cleaned up temporary directory: {TEMP_DIR}")
        except Exception as e:
            print(f"Error cleaning up temp directory {TEMP_DIR}: {e}")

if __name__ == '__main__':
    import atexit
    atexit.register(cleanup) # Register cleanup function
    # Use 0.0.0.0 to make it accessible from the container network
    # Use a specific port, e.g., 5001
    app.run(host='0.0.0.0', port=5001, debug=True) # Enable debug for development