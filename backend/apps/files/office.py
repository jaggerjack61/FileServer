from __future__ import annotations

import base64
import re
from io import BytesIO

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from openpyxl import Workbook, load_workbook
from openpyxl.utils import get_column_letter
from pptx import Presentation
from pptx.util import Emu


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


# ---------------------------------------------------------------------------
# Theme color resolution
# ---------------------------------------------------------------------------
# Office files use theme-based colors (e.g. dk1, lt1, accent1) that reference
# the slide/document theme rather than storing an explicit RGB value.  When the
# colour object only carries a theme reference we attempt to resolve it through
# the theme XML stored inside the Office package.  If resolution fails the
# colour falls back to ``None`` (rendered as default black on the frontend).

# Fallback map for the most common theme slots when the actual theme XML is not
# available or cannot be parsed.  Values taken from the default Office theme.
_THEME_COLOR_FALLBACKS: dict[int, str] = {
    0: "000000",   # dk1  – typically black
    1: "FFFFFF",   # lt1  – typically white
    2: "44546A",   # dk2
    3: "E7E6E6",   # lt2
    4: "4472C4",   # accent1
    5: "ED7D31",   # accent2
    6: "A5A5A5",   # accent3
    7: "FFC000",   # accent4
    8: "5B9BD5",   # accent5
    9: "70AD47",   # accent6
    10: "0563C1",  # hlink
    11: "954F72",  # folHlink
}


def _resolve_theme_color(color_obj, theme_element=None) -> str | None:
    """Try to resolve a theme-based colour to a 6-char hex RGB string."""
    theme_idx = getattr(color_obj, "theme_color", None)
    if theme_idx is None:
        return None

    # python-pptx / python-docx store the MSO theme enum as an int
    idx = int(theme_idx) if not isinstance(theme_idx, int) else theme_idx

    # Attempt resolution via the actual theme XML (when provided)
    if theme_element is not None:
        resolved = _resolve_theme_from_xml(theme_element, idx)
        if resolved:
            return resolved

    return _THEME_COLOR_FALLBACKS.get(idx)


def _resolve_theme_from_xml(theme_element, idx: int) -> str | None:
    """Parse <a:theme> XML to extract the colour for *idx*."""
    try:
        ns = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
        # Map MSO theme index to XPath within the colour scheme.
        # Indices 0-3 map to dk1/lt1/dk2/lt2; 4-9 to accent1-accent6;
        # 10 = hlink, 11 = folHlink.
        _slot_tags = [
            "a:dk1", "a:lt1", "a:dk2", "a:lt2",
            "a:accent1", "a:accent2", "a:accent3",
            "a:accent4", "a:accent5", "a:accent6",
            "a:hlink", "a:folHlink",
        ]
        if idx < 0 or idx >= len(_slot_tags):
            return None

        clr_scheme = theme_element.find(".//a:themeElements/a:clrScheme", ns)
        if clr_scheme is None:
            return None

        slot = clr_scheme.find(_slot_tags[idx], ns)
        if slot is None:
            return None

        # The slot may contain <a:srgbClr val="..."/> or <a:sysClr lastClr="..."/>
        srgb = slot.find("a:srgbClr", ns)
        if srgb is not None:
            val = (srgb.get("val") or "").strip().upper()
            if re.fullmatch(r"[0-9A-F]{6}", val):
                return val

        sys_clr = slot.find("a:sysClr", ns)
        if sys_clr is not None:
            val = (sys_clr.get("lastClr") or "").strip().upper()
            if re.fullmatch(r"[0-9A-F]{6}", val):
                return val
    except Exception:
        pass
    return None


def _get_theme_element_from_docx(document: Document):
    """Extract the <a:theme> root element from a python-docx Document."""
    try:
        theme_part = document.part.part_related_by("http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme")
        return theme_part.element
    except Exception:
        return None


def _get_theme_element_from_pptx(presentation: Presentation):
    """Extract the <a:theme> root element from a python-pptx Presentation."""
    try:
        slide_master = presentation.slide_masters[0]
        theme_part = slide_master.part.part_related_by("http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme")
        return theme_part.element
    except Exception:
        return None


def _safe_color_rgb(color_obj, theme_element=None) -> str | None:
    if color_obj is None:
        return None

    try:
        rgb = getattr(color_obj, "rgb", None)
    except Exception:
        rgb = None

    if rgb is not None:
        value = str(rgb).strip().upper()
        if value and value != "00000000":
            if len(value) == 8:
                value = value[2:]
            if re.fullmatch(r"[0-9A-F]{6}", value):
                return value

    # Fall back to theme colour resolution
    resolved = _resolve_theme_color(color_obj, theme_element)
    if resolved:
        return resolved

    return None


def _map_word_style(style_name: str) -> str | None:
    normalized = (style_name or "").strip().lower()
    if normalized == "subtitle":
        return "subtitle"
    if normalized == "title":
        return "title"
    if normalized.startswith("heading"):
        match = re.search(r"(\d+)", normalized)
        if match:
            level = int(match.group(1))
            if 1 <= level <= 4:
                return f"heading{level}"
    if "list" in normalized:
        return "list"
    return None


def _map_word_alignment(alignment) -> str | None:
    alignment_map = {
        WD_ALIGN_PARAGRAPH.LEFT: "left",
        WD_ALIGN_PARAGRAPH.CENTER: "center",
        WD_ALIGN_PARAGRAPH.RIGHT: "right",
        WD_ALIGN_PARAGRAPH.JUSTIFY: "justify",
    }
    return alignment_map.get(alignment)


def _extract_word_runs(paragraph, theme_element=None) -> list[dict] | None:
    runs = []
    has_formatting = False

    for run in paragraph.runs:
        run_payload = {"text": run.text or ""}

        if run.bold is True:
            run_payload["bold"] = True
            has_formatting = True
        if run.italic is True:
            run_payload["italic"] = True
            has_formatting = True
        if run.underline is True:
            run_payload["underline"] = True
            has_formatting = True
        if run.font.size is not None:
            run_payload["fontSize"] = round(run.font.size.pt, 1)
            has_formatting = True

        color = _safe_color_rgb(run.font.color, theme_element)
        if color:
            run_payload["color"] = color
            has_formatting = True

        runs.append(run_payload)

    if len(runs) > 1 or has_formatting:
        return runs
    return None


def _extract_presentation_runs(text_frame, theme_element=None) -> list[dict]:
    runs = []
    paragraphs = list(text_frame.paragraphs)

    for paragraph_index, paragraph in enumerate(paragraphs):
        paragraph_runs = []

        for run in paragraph.runs:
            run_payload = {"text": run.text or ""}

            if run.font.bold is True:
                run_payload["bold"] = True
            if run.font.italic is True:
                run_payload["italic"] = True
            if run.font.size is not None:
                run_payload["fontSize"] = round(run.font.size.pt, 1)

            color = _safe_color_rgb(run.font.color, theme_element)
            if color:
                run_payload["color"] = color

            paragraph_runs.append(run_payload)

        if not paragraph_runs:
            paragraph_runs.append({"text": paragraph.text or ""})

        runs.extend(paragraph_runs)
        if paragraph_index < len(paragraphs) - 1:
            runs.append({"text": "\n"})

    return runs


def _extract_word_table(table, theme_element=None) -> dict:
    """Extract a Word table into a serialisable dict."""
    rows = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            cell_payload: dict = {"text": cell.text}

            # Attempt to extract formatted runs from the first paragraph
            if cell.paragraphs:
                first_para = cell.paragraphs[0]
                runs = _extract_word_runs(first_para, theme_element)
                if runs:
                    cell_payload["runs"] = runs

            cells.append(cell_payload)
        rows.append(cells)
    return {"rows": rows}


def _extract_word_images(document) -> list[dict]:
    """Extract embedded images from a Word document as base64 data-URIs."""
    images: list[dict] = []
    try:
        for rel in document.part.rels.values():
            if "image" in (rel.reltype or ""):
                blob = rel.target_part.blob
                content_type = getattr(rel.target_part, "content_type", "image/png")
                encoded = base64.b64encode(blob).decode("ascii")
                images.append({
                    "contentType": content_type,
                    "dataUri": f"data:{content_type};base64,{encoded}",
                })
    except Exception:
        pass
    return images


def _load_word_document(content: bytes) -> dict:
    document = Document(BytesIO(content))
    theme_element = _get_theme_element_from_docx(document)

    # --- Block-level items in document order ---
    # python-docx exposes paragraphs and tables separately. To preserve the
    # reading order we iterate over the underlying XML body children and emit
    # either a paragraph or a table record as appropriate.
    body = document.element.body
    paragraphs: list[dict] = []
    tables: list[dict] = []

    # Build lookup maps: element -> parsed object
    _para_map = {p._element: p for p in document.paragraphs}
    _table_map = {t._element: t for t in document.tables}

    blocks: list[dict] = []

    for child in body:
        if child in _para_map:
            para = _para_map[child]
            paragraph_payload: dict = {"text": para.text}

            style = _map_word_style(getattr(getattr(para, "style", None), "name", ""))
            if style:
                paragraph_payload["style"] = style

            alignment = _map_word_alignment(para.alignment)
            if alignment:
                paragraph_payload["alignment"] = alignment

            runs = _extract_word_runs(para, theme_element)
            if runs:
                paragraph_payload["runs"] = runs

            paragraphs.append(paragraph_payload)
            blocks.append({"type": "paragraph", "index": len(paragraphs) - 1})

        elif child in _table_map:
            table = _table_map[child]
            tables.append(_extract_word_table(table, theme_element))
            blocks.append({"type": "table", "index": len(tables) - 1})

    if not paragraphs and not tables:
        paragraphs = [{"text": ""}]
        blocks = [{"type": "paragraph", "index": 0}]

    # --- Embedded images ---
    images = _extract_word_images(document)

    result: dict = {
        "kind": "word",
        "format": "docx",
        "paragraphs": paragraphs,
    }

    if tables:
        result["tables"] = tables
    if blocks:
        result["blocks"] = blocks
    if images:
        result["images"] = images

    return result


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
        merged_cells = []
        cells = {}

        for merged_range in worksheet.merged_cells.ranges:
            max_row = max(max_row, merged_range.max_row)
            max_col = max(max_col, merged_range.max_col)
            merged_cells.append([
                merged_range.min_row - 1,
                merged_range.min_col - 1,
                merged_range.max_row - 1,
                merged_range.max_col - 1,
            ])

        for row_index in range(1, max_row + 1):
            row_values = []
            for col_index in range(1, max_col + 1):
                cell = worksheet.cell(row=row_index, column=col_index)
                value = cell.value
                row_values.append("" if value is None else str(value))

                cell_payload = {}
                if cell.font.bold:
                    cell_payload["bold"] = True
                if cell.font.italic:
                    cell_payload["italic"] = True

                font_color = _safe_color_rgb(cell.font.color)
                if font_color:
                    cell_payload["color"] = font_color

                if cell.font.size is not None:
                    cell_payload["fontSize"] = round(float(cell.font.size), 1)

                background_color = _safe_color_rgb(getattr(cell.fill, "fgColor", None))
                if background_color:
                    cell_payload["bgColor"] = background_color

                if cell.alignment.horizontal:
                    cell_payload["align"] = cell.alignment.horizontal

                if cell_payload:
                    cells[f"{row_index - 1},{col_index - 1}"] = cell_payload
            rows.append(row_values)

        rows = _trim_sheet_rows(rows)
        sheet_payload = {"name": worksheet.title, "rows": rows or [[""]]}

        if cells:
            sheet_payload["cells"] = cells
        if merged_cells:
            sheet_payload["mergedCells"] = merged_cells

        column_widths = []
        for col_index in range(1, max_col + 1):
            column_dimension = worksheet.column_dimensions.get(get_column_letter(col_index))
            column_widths.append(column_dimension.width if column_dimension and column_dimension.width is not None else None)

        if any(width is not None for width in column_widths):
            sheet_payload["columnWidths"] = column_widths

        sheets.append(sheet_payload)

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


def _extract_presentation_images(presentation) -> list[dict]:
    """Extract embedded images from all slides as base64 data-URIs."""
    images: list[dict] = []
    seen_blobs: set[int] = set()
    try:
        for slide in presentation.slides:
            for rel in slide.part.rels.values():
                if "image" in (rel.reltype or ""):
                    blob = rel.target_part.blob
                    blob_id = id(rel.target_part)
                    if blob_id in seen_blobs:
                        continue
                    seen_blobs.add(blob_id)
                    content_type = getattr(rel.target_part, "content_type", "image/png")
                    encoded = base64.b64encode(blob).decode("ascii")
                    images.append({
                        "contentType": content_type,
                        "dataUri": f"data:{content_type};base64,{encoded}",
                    })
    except Exception:
        pass
    return images


def _load_presentation(content: bytes) -> dict:
    presentation = Presentation(BytesIO(content))
    theme_element = _get_theme_element_from_pptx(presentation)
    slides = []
    slide_width = float(Emu(presentation.slide_width)) or 1.0
    slide_height = float(Emu(presentation.slide_height)) or 1.0

    for slide in presentation.slides:
        title_text = ""
        title_shape = slide.shapes.title if slide.shapes.title else None
        title_runs = None
        if title_shape is not None and getattr(title_shape, "has_text_frame", False):
            title_text = title_shape.text_frame.text
            extracted_title_runs = _extract_presentation_runs(title_shape.text_frame, theme_element)
            title_runs = extracted_title_runs or None

        shapes = []
        for shape_index, shape in enumerate(slide.shapes):
            if not getattr(shape, "has_text_frame", False):
                continue
            if title_shape is not None and shape == title_shape:
                continue
            shape_payload = {
                "index": shape_index,
                "name": shape.name or f"Text {len(shapes) + 1}",
                "text": shape.text_frame.text,
                "left": round(float(Emu(shape.left)) / slide_width * 100, 1),
                "top": round(float(Emu(shape.top)) / slide_height * 100, 1),
                "width": round(float(Emu(shape.width)) / slide_width * 100, 1),
                "height": round(float(Emu(shape.height)) / slide_height * 100, 1),
            }
            extracted_runs = _extract_presentation_runs(shape.text_frame, theme_element)
            if extracted_runs:
                shape_payload["runs"] = extracted_runs
            shapes.append(shape_payload)

        slide_payload = {"title": title_text, "shapes": shapes}
        if title_runs:
            slide_payload["titleRuns"] = title_runs
        slides.append(slide_payload)

    if not slides:
        slides = [{"title": "", "shapes": []}]

    images = _extract_presentation_images(presentation)

    result: dict = {
        "kind": "presentation",
        "format": "pptx",
        "slides": slides,
    }

    if images:
        result["images"] = images

    return result


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