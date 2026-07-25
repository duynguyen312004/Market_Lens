from typing import Any


def number(value: Any) -> int | float:
    numeric = float(value)
    if numeric.is_integer():
        return int(numeric)
    return round(numeric, 2)


def percent(numerator: int | float, denominator: int | float) -> float:
    if float(denominator) <= 0:
        return 0.0
    return round(float(numerator) / float(denominator) * 100, 6)
