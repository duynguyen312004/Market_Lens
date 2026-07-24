import pytest

from backend.start import resolve_port


def test_resolve_port_uses_local_default() -> None:
    assert resolve_port(None) == 8000


def test_resolve_port_accepts_platform_port() -> None:
    assert resolve_port("10000") == 10_000


@pytest.mark.parametrize("value", ["abc", "0", "65536", "-1"])
def test_resolve_port_rejects_invalid_values(value: str) -> None:
    with pytest.raises(RuntimeError):
        resolve_port(value)
