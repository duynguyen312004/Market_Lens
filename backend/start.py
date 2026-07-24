import os
import sys


def resolve_port(value: str | None) -> int:
    raw_value = value or "8000"
    try:
        port = int(raw_value)
    except ValueError as error:
        raise RuntimeError("PORT phải là số nguyên.") from error

    if not 1 <= port <= 65_535:
        raise RuntimeError("PORT phải nằm trong khoảng 1-65535.")
    return port


def main() -> None:
    port = resolve_port(os.getenv("PORT"))
    os.execv(
        sys.executable,
        [
            sys.executable,
            "-m",
            "fastapi",
            "run",
            "backend/app/main.py",
            "--host",
            "0.0.0.0",
            "--port",
            str(port),
            "--proxy-headers",
        ],
    )


if __name__ == "__main__":
    main()
