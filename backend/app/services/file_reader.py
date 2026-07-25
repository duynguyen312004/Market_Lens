from io import BytesIO, StringIO
from pathlib import Path
from zipfile import BadZipFile, LargeZipFile, ZipFile

import pandas as pd
from openpyxl import load_workbook
from pandas.errors import EmptyDataError, ParserError

from backend.app.core.errors import AppError


ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
MAX_XLSX_ARCHIVE_FILES = 1_000
MAX_XLSX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024


def sanitize_file_name(file_name: str | None) -> str:
    safe_name = Path(file_name or "sales-data").name.strip()
    return safe_name[:255] or "sales-data"


def read_sales_file(*, file_name: str, content: bytes) -> pd.DataFrame:
    extension = Path(file_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="Only CSV and XLSX files are supported.",
            status_code=400,
            details={"allowed_extensions": sorted(ALLOWED_EXTENSIONS)},
        )

    if not content:
        raise AppError(
            code="EMPTY_FILE",
            message="The file does not contain data.",
            status_code=400,
        )

    try:
        if extension == ".csv":
            text = content.decode("utf-8-sig")
            frame = pd.read_csv(StringIO(text), sep=",", dtype=object)
        else:
            _validate_workbook_structure(content)
            frame = pd.read_excel(
                BytesIO(content),
                sheet_name=0,
                dtype=object,
                engine="openpyxl",
            )
    except (UnicodeDecodeError, EmptyDataError):
        raise AppError(
            code="EMPTY_FILE",
            message="The file is empty or does not use UTF-8 encoding.",
            status_code=400,
        ) from None
    except (ParserError, ValueError, OSError, KeyError):
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="The file cannot be read. Check the CSV or XLSX format.",
            status_code=400,
        ) from None

    if frame.empty and len(frame.columns) == 0:
        raise AppError(
            code="EMPTY_FILE",
            message="The file does not contain data.",
            status_code=400,
        )

    return frame


def _validate_workbook_structure(content: bytes) -> None:
    _validate_xlsx_archive(content)

    workbook = None
    try:
        workbook = load_workbook(
            BytesIO(content),
            read_only=False,
            data_only=False,
        )
    except Exception as error:
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="The XLSX file is damaged or unreadable.",
            status_code=400,
        ) from error

    try:
        worksheet = workbook.worksheets[0]
        if worksheet.merged_cells.ranges:
            raise AppError(
                code="INVALID_FILE_TYPE",
                message="XLSX files cannot contain merged cells.",
                status_code=400,
                details={"reason": "merged_cells_not_supported"},
            )
    finally:
        workbook.close()


def _validate_xlsx_archive(content: bytes) -> None:
    try:
        with ZipFile(BytesIO(content)) as archive:
            files = [
                item for item in archive.infolist() if not item.is_dir()
            ]
    except (BadZipFile, LargeZipFile, OSError) as error:
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="The XLSX file is damaged or unreadable.",
            status_code=400,
            details={"reason": "invalid_xlsx_archive"},
        ) from error

    if len(files) > MAX_XLSX_ARCHIVE_FILES:
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="The XLSX structure is too complex.",
            status_code=400,
            details={"reason": "xlsx_archive_too_many_files"},
        )

    unsafe_path = any(
        Path(item.filename).is_absolute()
        or ".." in Path(item.filename).parts
        for item in files
    )
    if unsafe_path or any(item.flag_bits & 0x1 for item in files):
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="The XLSX file has an unsafe structure.",
            status_code=400,
            details={"reason": "unsafe_xlsx_archive"},
        )

    uncompressed_bytes = sum(item.file_size for item in files)
    if uncompressed_bytes > MAX_XLSX_UNCOMPRESSED_BYTES:
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="The extracted XLSX content exceeds the safety limit.",
            status_code=400,
            details={"reason": "xlsx_archive_too_large"},
        )
