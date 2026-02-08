#!/bin/bash

# RealBench Pro startup script

echo "🎯 RealBench Pro - Starting..."

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env and add your API keys"
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check for dependencies
cd backend
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

# Start the server
echo "🚀 Starting FastAPI server..."
python app/main.py
