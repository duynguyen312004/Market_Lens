import json

from scripts.verify_academic_evidence import (
    EVIDENCE_PATH,
    build_academic_evidence,
)


def test_committed_academic_evidence_matches_production_pipeline() -> None:
    expected = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))

    assert build_academic_evidence() == expected
