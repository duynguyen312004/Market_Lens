from __future__ import annotations

import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_PARTS = {
    ".git",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "dist",
    "node_modules",
}
TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".py",
    ".sql",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}
ROOT_TEXT_FILES = {
    ".dockerignore",
    ".gitignore",
    "Dockerfile",
}
SECRET_PATTERNS = {
    "Gemini API key": re.compile(r"\bAIza[0-9A-Za-z_-]{30,}\b"),
    "OpenAI API key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "Supabase secret key": re.compile(
        r"\bsb_secret_[A-Za-z0-9_-]{12,}\b"
    ),
    "private key": re.compile(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----"),
}
FRONTEND_FORBIDDEN = {
    "AI_API_KEY",
    "SUPABASE_SECRET_KEY",
    "sb_secret_",
}


def is_scannable(path: Path) -> bool:
    relative = path.relative_to(PROJECT_ROOT)
    if any(part in EXCLUDED_PARTS for part in relative.parts):
        return False
    if path.name in {".env", ".env.local"}:
        return False
    if path.name.startswith(".env.") and path.name != ".env.example":
        return False
    return path.suffix.lower() in TEXT_SUFFIXES or path.name in ROOT_TEXT_FILES


def main() -> None:
    findings: list[tuple[str, str]] = []

    for path in PROJECT_ROOT.rglob("*"):
        if not path.is_file() or not is_scannable(path):
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue

        relative = path.relative_to(PROJECT_ROOT).as_posix()
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(content):
                findings.append((relative, label))

        if relative.startswith(("frontend/src/", "frontend/public/")):
            for variable in FRONTEND_FORBIDDEN:
                if variable in content:
                    findings.append(
                        (relative, f"frontend chứa {variable}")
                    )

    if findings:
        print("Secret scan: FAIL")
        for relative, label in sorted(set(findings)):
            print(f"- {relative}: {label}")
        raise SystemExit(1)

    print("Secret scan: PASS (không đọc file .env local).")


if __name__ == "__main__":
    main()
