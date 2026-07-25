"""Run the real protected browser journey with a disposable Supabase user."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
SAMPLE_PATH = PROJECT_ROOT / "sample_data" / "sample_sales_demo_60_days.csv"
COMBINED_PATH_1 = (
    FRONTEND_DIR / "public" / "marketlens_combined_demo_part_1.csv"
)
COMBINED_PATH_2 = (
    FRONTEND_DIR / "public" / "marketlens_combined_demo_part_2.csv"
)

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.browser_e2e_support import (
    browser_environment,
    temporary_browser_user,
)


def main() -> None:
    with temporary_browser_user("Browser journey E2E") as user:
        environment = browser_environment(user)
        environment["E2E_SAMPLE_PATH"] = str(SAMPLE_PATH)
        environment["E2E_COMBINED_PATH_1"] = str(COMBINED_PATH_1)
        environment["E2E_COMBINED_PATH_2"] = str(COMBINED_PATH_2)
        subprocess.run(
            ["npm", "run", "test:e2e:journey"],
            cwd=FRONTEND_DIR,
            env=environment,
            check=True,
        )

        screenshots = sorted(
            (FRONTEND_DIR / "test-results" / "playwright").glob(
                "**/journey-*.png"
            )
        )
        if len(screenshots) != 3:
            raise RuntimeError(
                "Playwright passed without all three journey screenshots."
            )
        print("Browser journey E2E: PASS (3 visual artifacts).")


if __name__ == "__main__":
    main()
