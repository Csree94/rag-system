#!/usr/bin/env python3
"""Test that the FastAPI server starts and endpoints are accessible."""
import threading
import time
import urllib.request
import json

from app.main import app
import uvicorn

print("Starting FastAPI server...")

# Start uvicorn in a thread
def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning", reload=False)

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

# Wait for server to start
time.sleep(3)

try:
    # Test root endpoint
    print("\n1. Testing root endpoint (http://127.0.0.1:8000/)...")
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/", timeout=5) as resp:
            data = json.loads(resp.read())
            print(f"   ✓ Root endpoint accessible: {data}")
    except Exception as e:
        print(f"   ✗ Root endpoint error: {e}")

    # Test Swagger
    print("\n2. Testing Swagger UI (http://127.0.0.1:8000/docs)...")
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/docs", timeout=5) as resp:
            print(f"   ✓ Swagger UI accessible (status: {resp.status})")
    except Exception as e:
        print(f"   ✗ Swagger UI error: {e}")

    # Test OpenAPI schema
    print("\n3. Testing OpenAPI schema (http://127.0.0.1:8000/openapi.json)...")
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/openapi.json", timeout=5) as resp:
            data = json.loads(resp.read())
            paths = list(data.get("paths", {}).keys())
            print(f"   ✓ OpenAPI schema accessible")
            print(f"   Registered paths: {paths}")
            if "/api/retrieve" in paths:
                print(f"   ✓ POST /api/retrieve endpoint registered")
                methods = list(data["paths"]["/api/retrieve"].keys())
                print(f"   Methods: {methods}")
    except Exception as e:
        print(f"   ✗ OpenAPI schema error: {e}")

    print("\n" + "="*50)
    print("SERVER TEST SUMMARY")
    print("="*50)
    print("Command: uvicorn app.main:app --host 127.0.0.1 --port 8000")
    print("URL: http://127.0.0.1:8000")
    print("Retrieval endpoint: POST /api/retrieve")
    print("Swagger: http://127.0.0.1:8000/docs")
    print("="*50)

except KeyboardInterrupt:
    pass

print("\nServer test complete.")
