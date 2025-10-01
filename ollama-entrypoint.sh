#!/bin/bash
set -e

# Start Ollama server in background
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "Waiting for Ollama server to start..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done

echo "Ollama server is ready"

# Pull models if they don't exist
MODELS="llama2 codellama mistral"

for MODEL in $MODELS; do
  echo "Checking model: $MODEL"
  if ! ollama list | grep -q "$MODEL"; then
    echo "Pulling model: $MODEL"
    ollama pull "$MODEL" || echo "Failed to pull $MODEL, continuing..."
  else
    echo "Model $MODEL already exists"
  fi
done

echo "Model setup complete"

# Keep server running (wait for background process)
wait $OLLAMA_PID
