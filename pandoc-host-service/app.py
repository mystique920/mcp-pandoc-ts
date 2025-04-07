import os
import tempfile
import shutil
import pypandoc
import base64
import uuid
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
    temp_output_file = None # Initialize to ensure cleanup check works
    try:
        # Prepare extra args if needed (e.g., for PDF)
        extra_args = []
        if output_format == 'pdf':
             extra_args.extend(['--pdf-engine=xelatex', '-V', 'geometry:margin=1in'])

        # Define formats requiring file output on host
        FILE_OUTPUT_FORMATS = ['pdf', 'docx', 'epub', 'odt', 'pptx'] # Common binary/complex formats

        if output_format in FILE_OUTPUT_FORMATS:
            app.logger.info(f"Handling file output format: {output_format}")
            # Generate a unique temporary file path on the host
            temp_filename = f"{uuid.uuid4()}.{output_format}"
            temp_output_file = os.path.join(TEMP_DIR, temp_filename)
            app.logger.info(f"Generating temporary host file: {temp_output_file}")

            # Convert text content to a file on the host
            pypandoc.convert_text(
                source=contents,
                to=output_format,
                format=input_format,
                outputfile=temp_output_file,
                extra_args=extra_args
            )
            app.logger.info(f"Successfully created temporary file: {temp_output_file}")

            # Read the binary content of the generated file
            with open(temp_output_file, 'rb') as f:
                file_content_binary = f.read()

            # Encode content as base64 string for JSON transfer
            file_content_base64 = base64.b64encode(file_content_binary).decode('utf-8')
            app.logger.info(f"Read and base64 encoded file content (length: {len(file_content_base64)} chars).")

            return jsonify({
                "message": "File generated successfully on host",
                "file_content_base64": file_content_base64,
                "output_format": output_format # Include format for potential decoding hints
            }), 200

        else:
            # Convert text to text format (e.g., html, markdown, rst, latex, txt)
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
                "converted_content": converted_output # Return plain text
            }), 200

    except Exception as e:
        # Catch potential pypandoc errors (pandoc not found, conversion failed, etc.)
        app.logger.error(f"Pandoc conversion failed: {e}", exc_info=True) # Log traceback
        return jsonify({"error": f"Pandoc conversion failed: {str(e)}"}), 500
    finally:
        # Ensure temporary file is deleted if it was created
        if temp_output_file and os.path.exists(temp_output_file):
            try:
                os.remove(temp_output_file)
                app.logger.info(f"Successfully deleted temporary file: {temp_output_file}")
            except Exception as e:
                app.logger.error(f"Error deleting temporary file {temp_output_file}: {e}")


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