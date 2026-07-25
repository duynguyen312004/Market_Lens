"""Run the real browser report/PDF smoke test with disposable Supabase data.

The script creates one confirmed temporary user, uploads the committed demo
dataset through the protected FastAPI endpoint, runs Playwright, and removes
the user's analysis and auth account in a finally block.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
SAMPLE_PATH = PROJECT_ROOT / "sample_data" / "sample_sales_demo_60_days.csv"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from backend.app.main import app
from scripts.browser_e2e_support import (
    browser_environment,
    temporary_browser_user,
    user_access_token,
)


def main() -> None:
    with temporary_browser_user("Report E2E") as user:
        with TestClient(app) as api_client:
            response = api_client.post(
                "/api/v1/analyses",
                headers={
                    "Authorization": f"Bearer {user_access_token(user)}",
                },
                files={
                    "file": (
                        SAMPLE_PATH.name,
                        SAMPLE_PATH.read_bytes(),
                        "text/csv",
                    )
                },
            )
        if response.status_code != 201:
            raise RuntimeError(
                "Protected demo upload failed "
                f"with HTTP {response.status_code}."
            )

        subprocess.run(
            ["npm", "run", "test:e2e:report"],
            cwd=FRONTEND_DIR,
            env=browser_environment(user),
            check=True,
        )

        artifacts = sorted(
            (FRONTEND_DIR / "test-results" / "playwright").glob(
                "**/report-a4.pdf"
            )
        )
        if len(artifacts) != 1:
            raise RuntimeError(
                "Playwright passed without exactly one report PDF artifact."
            )
        print(
            "Report E2E: PASS "
            f"(artifact={artifacts[0].relative_to(PROJECT_ROOT)})."
        )


if __name__ == "__main__":
    main()
