from types import SimpleNamespace
from typing import Any

from backend.app.repositories.import_profiles_repository import (
    ImportProfilesRepository,
    _database_error,
)


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


class UniqueViolation(Exception):
    code = "23505"


def test_unique_profile_name_has_conflict_error_contract() -> None:
    error = _database_error(UniqueViolation())

    assert error.code == "IMPORT_PROFILE_NAME_CONFLICT"
    assert error.status_code == 409


def test_create_profile_assigns_verified_user_id() -> None:
    client = FakeClient([[{"id": "profile-id"}]])
    repository = ImportProfilesRepository(client)  # type: ignore[arg-type]

    repository.create_profile(
        user_id="verified-user",
        payload={
            "name": "Shopee của tôi",
            "source_type": "shopee",
            "column_mapping": {},
            "status_mapping": {},
            "header_fingerprint": "a" * 64,
            "schema_version": 2,
        },
    )

    insert = next(
        operation
        for operation in client.queries[0].operations
        if operation[0] == "insert"
    )
    assert insert[1]["user_id"] == "verified-user"


def test_list_profile_filters_by_verified_user() -> None:
    client = FakeClient([[]])
    repository = ImportProfilesRepository(client)  # type: ignore[arg-type]

    repository.list_profiles_for_user(user_id="owner")

    operations = client.queries[0].operations
    assert ("eq", "user_id", "owner") in operations
    assert ("order", "updated_at", True) in operations


def test_get_profile_filters_by_id_and_verified_user() -> None:
    client = FakeClient([[]])
    repository = ImportProfilesRepository(client)  # type: ignore[arg-type]

    repository.get_profile_for_user(
        profile_id="profile-id",
        user_id="owner",
    )

    operations = client.queries[0].operations
    assert ("eq", "id", "profile-id") in operations
    assert ("eq", "user_id", "owner") in operations


def test_update_profile_filters_write_by_verified_user() -> None:
    client = FakeClient(
        [
            [{"id": "profile-id", "user_id": "owner"}],
            [{"id": "profile-id", "name": "Cấu hình mới"}],
        ]
    )
    repository = ImportProfilesRepository(client)  # type: ignore[arg-type]

    repository.update_profile_for_user(
        profile_id="profile-id",
        user_id="owner",
        payload={"name": "Cấu hình mới"},
    )

    operations = client.queries[1].operations
    assert ("eq", "id", "profile-id") in operations
    assert ("eq", "user_id", "owner") in operations


def test_delete_profile_filters_write_by_verified_user() -> None:
    client = FakeClient(
        [
            [{"id": "profile-id", "user_id": "owner"}],
            [{"id": "profile-id"}],
        ]
    )
    repository = ImportProfilesRepository(client)  # type: ignore[arg-type]

    deleted = repository.delete_profile_for_user(
        profile_id="profile-id",
        user_id="owner",
    )

    assert deleted is True
    operations = client.queries[1].operations
    assert ("delete",) in operations
    assert ("eq", "id", "profile-id") in operations
    assert ("eq", "user_id", "owner") in operations
