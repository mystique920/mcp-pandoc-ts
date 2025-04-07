#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
  echo "Activating virtual environment..."
  source venv/bin/activate
fi

# Run the Flask app using Waitress
echo "Starting Flask app with Waitress on http://0.0.0.0:5001..."
waitress-serve --host=0.0.0.0 --port=5001 app:app

# Deactivate virtual environment on exit (optional)
# if [ -d "venv" ]; then
#   deactivate
# fi