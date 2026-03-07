from __future__ import annotations

import re
from io import BytesIO

from docx import Document
from openpyxl import Workbook, load_workbook
from pptx import Presentation


SUPPORTED_DOCUMENT_EXTENSIONS = {"docx"}
SUPPORTED_SPREADSHEET_EXTENSIONS = {"xlsx"}
SUPPORTED_PRESENTATION_EXTENSIONS = {"pptx", "pptm"}


def get_office_editor_kind(file_type: str, filename: str) -> str | None:
    normalized_type = (file_type or "").lower()
    extension = _get_extension(filename)

    if extension in SUPPORTED_DOCUMENT_EXTENSIONS or "wordprocessingml.document" in normalized_type:
        return "word"
    if extension in SUPPORTED_SPREADSHEET_EXTENSIONS or "spreadsheetml.sheet" in normalized_type:
        return "spreadsheet"
    if extension in SUPPORTED_PRESENTATION_EXTENSIONS or "presentationml.presentation" in normalized_type:
        return "presentation"
    return None


def load_office_content(file_type: str, filename: str, content: bytes) -> dict:
    editor_kind = get_office_editor_kind(file_type, filename)
    if editor_kind == "word":
        return _load_word_document(content)
    if editor_kind == "spreadsheet":
        return _load_spreadsheet(content)
    if editor_kind == "presentation":
        return _load_presentation(content)
    raise ValueError("Unsupported office file type.")


def save_office_content(file_type: str, filename: str, current_content: bytes, payload: dict) -> bytes:
    editor_kind = get_office_editor_kind(file_type, filename)
    if editor_kind != payload.get("kind"):
        raise ValueError("Content payload does not match file type.")

    if editor_kind == "word":
        return _save_word_document(payload)
    if editor_kind == "spreadsheet":
        return _save_spreadsheet(payload)
    if editor_kind == "presentation":
        return _save_presentation(current_content, payload)
    raise ValueError("Unsupported office file type.")


def _load_word_document(content: bytes) -> dict:
    document = Document(BytesIO(content))
    paragraphs = [{"text": paragraph.text} for paragraph in document.paragraphs]
    if not paragraphs:
        paragraphs = [{"text": ""}]

    return {
        "kind": "word",
        "format": "docx",
        "paragraphs": paragraphs,
    }


def _save_word_document(payload: dict) -> bytes:
    document = Document()
    paragraphs = payload.get("paragraphs") or [{"text": ""}]

    for paragraph in paragraphs:
        text = str((paragraph or {}).get("text") or "")
        document.add_paragraph(text)

    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def _load_spreadsheet(content: bytes) -> dict:
    workbook = load_workbook(filename=BytesIO(content), data_only=False)
    sheets = []

    for worksheet in workbook.worksheets:
        rows = []
        max_row = max(worksheet.max_row or 0, 1)
        max_col = max(worksheet.max_column or 0, 1)

        for row_index in range(1, max_row + 1):
            row_values = []
            for col_index in range(1, max_col + 1):
                value = worksheet.cell(row=row_index, column=col_index).value
                row_values.append("" if value is None else str(value))
            rows.append(row_values)

        rows = _trim_sheet_rows(rows)
        sheets.append({"name": worksheet.title, "rows": rows or [[""]]})

    if not sheets:
        sheets = [{"name": "Sheet1", "rows": [[""]]}]

    return {
        "kind": "spreadsheet",
        "format": "xlsx",
        "sheets": sheets,
    }


def _save_spreadsheet(payload: dict) -> bytes:
    workbook = Workbook()
    default_sheet = workbook.active
    workbook.remove(default_sheet)

    for index, sheet in enumerate(payload.get("sheets") or [{"name": "Sheet1", "rows": [[""]]}]):
        sheet_name = _normalize_sheet_name(str(sheet.get("name") or f"Sheet{index + 1}"), index)
        worksheet = workbook.create_sheet(title=sheet_name)
        rows = sheet.get("rows") or [[""]]
        for row_index, row_values in enumerate(rows, start=1):
            for col_index, cell_value in enumerate(row_values or [], start=1):
                normalized_value = _coerce_spreadsheet_value(cell_value)
                if normalized_value != "":
                    worksheet.cell(row=row_index, column=col_index, value=normalized_value)

    if not workbook.worksheets:
        workbook.create_sheet(title="Sheet1")

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _load_presentation(content: bytes) -> dict:
    presentation = Presentation(BytesIO(content))
    slides = []

    for slide in presentation.slides:
        title_text = ""
        title_shape = slide.shapes.title if slide.shapes.title else None
        if title_shape is not None and getattr(title_shape, "has_text_frame", False):
            title_text = title_shape.text_frame.text

        shapes = []
        for shape_index, shape in enumerate(slide.shapes):
            if not getattr(shape, "has_text_frame", False):
                continue
            if title_shape is not None and shape == title_shape:
                continue
            shapes.append(
                {
                    "index": shape_index,
                    "name": shape.name or f"Text {len(shapes) + 1}",
                    "text": shape.text_frame.text,
                }
            )

        slides.append({"title": title_text, "shapes": shapes})

    if not slides:
        slides = [{"title": "", "shapes": []}]

    return {
        "kind": "presentation",
        "format": "pptx",
        "slides": slides,
    }


def _save_presentation(current_content: bytes, payload: dict) -> bytes:
    presentation = Presentation(BytesIO(current_content))
    slides_payload = payload.get("slides") or []

    for slide_index, slide in enumerate(presentation.slides):
        if slide_index >= len(slides_payload):
            break

        slide_payload = slides_payload[slide_index] or {}
        title_shape = slide.shapes.title if slide.shapes.title else None
        if title_shape is not None and getattr(title_shape, "has_text_frame", False):
            title_shape.text_frame.text = str(slide_payload.get("title") or "")

        incoming_shapes = {
            int(shape_payload.get("index")): str(shape_payload.get("text") or "")
            for shape_payload in slide_payload.get("shapes") or []
            if str(shape_payload.get("index", "")).isdigit()
        }

        for shape_index, shape in enumerate(slide.shapes):
            if shape_index not in incoming_shapes:
                continue
            if not getattr(shape, "has_text_frame", False):
                continue
            if title_shape is not None and shape == title_shape:
                continue
            shape.text_frame.text = incoming_shapes[shape_index]

    buffer = BytesIO()
    presentation.save(buffer)
    return buffer.getvalue()


def _trim_sheet_rows(rows: list[list[str]]) -> list[list[str]]:
    if not rows:
        return [[""]]

    max_used_col = 0
    max_used_row = 0
    for row_index, row in enumerate(rows):
        for col_index, value in enumerate(row):
            if value not in (None, ""):
                max_used_row = row_index + 1
                max_used_col = max(max_used_col, col_index + 1)

    max_used_row = max(max_used_row, 1)
    max_used_col = max(max_used_col, 1)

    trimmed = []
    for row in rows[:max_used_row]:
        sliced = row[:max_used_col]
        if len(sliced) < max_used_col:
            sliced.extend([""] * (max_used_col - len(sliced)))
        trimmed.append(sliced)
    return trimmed


def _coerce_spreadsheet_value(value):
    if value is None:
        return ""

    text = str(value)
    stripped = text.strip()
    if stripped == "":
        return ""
    if stripped.startswith("="):
        return stripped
    if stripped.lower() == "true":
        return True
    if stripped.lower() == "false":
        return False
    if re.fullmatch(r"-?(0|[1-9]\d*)", stripped):
        return int(stripped)
    if re.fullmatch(r"-?(0|[1-9]\d*)\.\d+", stripped):
        return float(stripped)
    return text


def _normalize_sheet_name(name: str, index: int) -> str:
    sanitized = re.sub(r"[:\\/?*\[\]]", " ", name).strip() or f"Sheet{index + 1}"
    return sanitized[:31]


def _get_extension(filename: str) -> str:
    parts = (filename or "").rsplit(".", 1)
    return parts[1].lower() if len(parts) == 2 else ""