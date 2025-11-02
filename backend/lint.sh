#!/bin/bash
# Linting script for the backend

set -e

echo "Running Ruff linter..."
ruff check app/ --fix

echo ""
echo "Running Ruff formatter..."
ruff format app/

echo ""
echo "Running MyPy type checker..."
mypy app/

echo ""
echo "✓ All checks passed!"
