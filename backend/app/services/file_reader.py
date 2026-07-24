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
            message="Chỉ hỗ trợ file CSV hoặc XLSX.",
            status_code=400,
            details={"allowed_extensions": sorted(ALLOWED_EXTENSIONS)},
        )

    if not content:
        raise AppError(
            code="EMPTY_FILE",
            message="File không có dữ liệu.",
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
            message="File rỗng hoặc không dùng encoding UTF-8.",
            status_code=400,
        ) from None
    except (ParserError, ValueError, OSError, KeyError):
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="Không thể đọc file. Hãy kiểm tra lại định dạng CSV/XLSX.",
            status_code=400,
        ) from None

    if frame.empty and len(frame.columns) == 0:
        raise AppError(
            code="EMPTY_FILE",
            message="File không có dữ liệu.",
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
            message="File XLSX bị lỗi hoặc không đọc được.",
            status_code=400,
        ) from error

    try:
        worksheet = workbook.worksheets[0]
        if worksheet.merged_cells.ranges:
            raise AppError(
                code="INVALID_FILE_TYPE",
                message="File XLSX không được chứa ô gộp.",
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
            message="File XLSX bị lỗi hoặc không đọc được.",
            status_code=400,
            details={"reason": "invalid_xlsx_archive"},
        ) from error

    if len(files) > MAX_XLSX_ARCHIVE_FILES:
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="File XLSX có cấu trúc quá phức tạp.",
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
            message="File XLSX có cấu trúc không an toàn.",
            status_code=400,
            details={"reason": "unsafe_xlsx_archive"},
        )

    uncompressed_bytes = sum(item.file_size for item in files)
    if uncompressed_bytes > MAX_XLSX_UNCOMPRESSED_BYTES:
        raise AppError(
            code="INVALID_FILE_TYPE",
            message="File XLSX giải nén vượt quá giới hạn an toàn.",
            status_code=400,
            details={"reason": "xlsx_archive_too_large"},
        )
