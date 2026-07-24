from datetime import date
from types import SimpleNamespace
from typing import Any

import pytest

from backend.app.core.errors import AppError
from backend.app.repositories.analyses_repository import AnalysesRepository


class FakeQuery:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data
        self.operations: list[tuple[Any, ...]] = []

    def select(self, columns: str) -> "FakeQuery":
        self.operations.append(("select", columns))
        return self

    def insert(self, payload: dict[str, Any]) -> "FakeQuery":
        self.operations.append(("insert", payload))
        return self

    def update(self, payload: dict[str, Any]) -> "FakeQuery":
        self.operations.append(("update", payload))
        return self

    def delete(self) -> "FakeQuery":
        self.operations.append(("delete",))
        return self

    def eq(self, column: str, value: Any) -> "FakeQuery":
        self.operations.append(("eq", column, value))
        return self

    def limit(self, value: int) -> "FakeQuery":
        self.operations.append(("limit", value))
        return self

    def order(self, column: str, *, desc: bool) -> "FakeQuery":
        self.operations.append(("order", column, desc))
        return self

    def range(self, start: int, end: int) -> "FakeQuery":
        self.operations.append(("range", start, end))
        return self

    def execute(self) -> SimpleNamespace:
        self.operations.append(("execute",))
        return SimpleNamespace(data=self.data)


class FakeClient:
    def __init__(self, responses: list[list[dict[str, Any]]]) -> None:
        self.responses = responses
        self.queries: list[FakeQuery] = []

    def table(self, name: str) -> FakeQuery:
        query = FakeQuery(self.responses[len(self.queries)])
        query.operations.append(("table", name))
        self.queries.append(query)
        return query


class FailingQuery(FakeQuery):
    def execute(self) -> SimpleNamespace:
        raise RuntimeError("database connection details must stay internal")


class FailingClient:
    def table(self, _: str) -> FailingQuery:
        return FailingQuery([])


def test_create_assigns_verified_user_id() -> None:
    record = {"id": "analysis-id"}
    client = FakeClient([[record]])
    repository = AnalysesRepository(client)  # type: ignore[arg-type]

    repository.create_analysis(
        user_id="verified-user",
        file_name="sales.csv",
        row_count=10,
        date_from=date(2026, 1, 1),
        date_to=date(2026, 1, 2),
        result_json={"summary": {}},
    )

    insert_operation = next(
        operation
        for operation in client.queries[0].operations
        if operation[0] == "insert"
    )
    assert insert_operation[1]["user_id"] == "verified-user"


def test_get_filters_by_analysis_and_verified_user() -> None:
    client = FakeClient([[{"id": "analysis-id", "user_id": "owner"}]])
    repository = AnalysesRepository(client)  # type: ignore[arg-type]

    repository.get_analysis_for_user(
        analysis_id="analysis-id",
        user_id="owner",
    )

    operations = client.queries[0].operations
    assert ("eq", "id", "analysis-id") in operations
    assert ("eq", "user_id", "owner") in operations


def test_list_filters_by_verified_user_before_pagination() -> None:
    client = FakeClient([[]])
    repository = AnalysesRepository(client)  # type: ignore[arg-type]

    repository.list_analyses_for_user(
        user_id="owner",
        limit=20,
        offset=40,
    )

    operations = client.queries[0].operations
    assert ("eq", "user_id", "owner") in operations
    assert ("order", "created_at", True) in operations
    assert ("range", 40, 59) in operations


def test_delete_filters_by_analysis_and_verified_user() -> None:
    client = FakeClient(
        [
            [{"id": "analysis-id", "user_id": "owner"}],
            [{"id": "analysis-id"}],
        ]
    )
    repository = AnalysesRepository(client)  # type: ignore[arg-type]

    deleted = repository.delete_analysis_for_user(
        analysis_id="analysis-id",
        user_id="owner",
    )

    assert deleted is True
    delete_operations = client.queries[1].operations
    assert ("delete",) in delete_operations
    assert ("eq", "id", "analysis-id") in delete_operations
    assert ("eq", "user_id", "owner") in delete_operations


def test_update_report_filters_by_analysis_and_verified_user() -> None:
    existing = {
        "id": "analysis-id",
        "user_id": "owner",
        "result_json": {"summary": {}, "report": {"source": "rule_based"}},
    }
    updated = {
        **existing,
        "result_json": {"summary": {}, "report": {"source": "ai"}},
    }
    client = FakeClient([[existing], [updated]])
    repository = AnalysesRepository(client)  # type: ignore[arg-type]

    result = repository.update_analysis_report_for_user(
        analysis_id="analysis-id",
        user_id="owner",
        report={"source": "ai"},
    )

    assert result == updated
    operations = client.queries[1].operations
    assert ("update", {"result_json": updated["result_json"]}) in operations
    assert ("eq", "id", "analysis-id") in operations
    assert ("eq", "user_id", "owner") in operations


def test_repository_failure_maps_to_safe_database_error() -> None:
    repository = AnalysesRepository(FailingClient())  # type: ignore[arg-type]

    with pytest.raises(AppError) as error:
        repository.list_analyses_for_user(
            user_id="owner",
            limit=20,
            offset=0,
        )

    assert error.value.status_code == 503
    assert error.value.code == "DATABASE_UNAVAILABLE"
    assert "connection details" not in error.value.message
