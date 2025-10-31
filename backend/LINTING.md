# Backend Linting & Type Checking

This backend uses **Ruff** for linting and formatting, and **MyPy** for static type checking.

## Configuration

All configuration is in `pyproject.toml`:

### Ruff Configuration
- **Line length**: 120 characters
- **Import sorting**: Enabled (isort-compatible)
- **Auto-fix**: Enabled for safe fixes
- **Checks enabled**:
  - `E` - pycodestyle errors
  - `F` - pyflakes (unused imports, variables, etc.)
  - `I` - isort (import sorting)
  - `UP` - pyupgrade (modern Python syntax)
  - `B` - flake8-bugbear (common bugs)
  - `C4` - flake8-comprehensions
  - `PIE` - flake8-pie
  - `SIM` - flake8-simplify
  - `RET` - flake8-return
  - `ARG` - flake8-unused-arguments

### MyPy Configuration
- **Python version**: 3.9+
- **Strict checks**: Partially enabled
- **Missing imports**: Ignored for libraries without type stubs

## Running Linters

### From project root:

```bash
# Lint and fix backend
npm run lint:backend

# Lint without fixes (CI mode)
npm run lint:backend:check

# Format code only
npm run format:backend

# Lint both frontend and backend
npm run lint
```

### From backend directory:

```bash
# Run all checks with auto-fix
./lint.sh

# Individual tools
ruff check app/ --fix        # Lint and fix
ruff format app/              # Format code
mypy app/                     # Type check
```

### Manual commands:

```bash
# Ruff
ruff check app/              # Check only
ruff check app/ --fix        # Check and fix
ruff format app/             # Format
ruff format app/ --check     # Check format without modifying

# MyPy
mypy app/                    # Type check all files
mypy app/main.py            # Type check specific file
```

## IDE Integration

### VS Code

Install the Ruff extension:
```json
{
  "recommendations": ["charliermarsh.ruff"]
}
```

Settings (`.vscode/settings.json`):
```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": true,
      "source.organizeImports": true
    },
    "editor.defaultFormatter": "charliermarsh.ruff"
  },
  "ruff.lineLength": 120
}
```

### PyCharm

1. Install the Ruff plugin from the marketplace
2. Go to Settings → Tools → Ruff
3. Enable "Run ruff on save"
4. Set line length to 120

## Common Fixes

### Unused Imports (F401)
Ruff will automatically remove unused imports with `--fix`.

### Import Sorting (I)
Imports are automatically sorted into:
1. Standard library
2. Third-party packages
3. First-party modules (`app.*`)

### Deprecated Type Hints (UP006, UP035)
```python
# Bad
from typing import List, Dict
def foo() -> List[str]: ...

# Good
def foo() -> list[str]: ...
```

### Line Length (E501)
Format with `ruff format` to automatically wrap lines at 120 characters.

## Pre-commit Hook

To run linting before each commit, create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
set -e

echo "Running Ruff..."
ruff check app/ --fix
ruff format app/

echo "Running MyPy..."
mypy app/

git add -u
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
- name: Install dependencies
  run: |
    pip install -e .[dev]

- name: Lint with Ruff
  run: |
    ruff check app/ --output-format=github
    ruff format app/ --check

- name: Type check with MyPy
  run: |
    mypy app/
```

## Troubleshooting

### "No such file or directory" error
Make sure you're in the backend directory or use the full path:
```bash
cd backend
ruff check app/
```

### MyPy can't find imports
Install type stubs for packages:
```bash
pip install types-requests  # Example
```

Or ignore specific packages in `pyproject.toml`:
```toml
[[tool.mypy.overrides]]
module = "package_name.*"
ignore_missing_imports = true
```

### Ruff and IDE formatter conflict
Disable other formatters (Black, autopep8) in your IDE and use only Ruff.
