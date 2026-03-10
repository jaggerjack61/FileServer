from __future__ import annotations

import base64
import re
from io import BytesIO

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from openpyxl import Workbook, load_workbook
from openpyxl.utils import get_column_letter
from pptx import Presentation
from pptx.util import Emu


SUPPORTED_DOCUMENT_EXTENSIONS = {"docx"}
SUPPORTED_SPREADSHEET_EXTENSIONS = {"xlsx"}
SUPPORTED_PRESENTATION_EXTENSIONS = {"pptx", "pptm"}

OOXML_NAMESPACES = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
}


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


def _local_name(tag) -> str:
    if not tag:
        return ""
    return str(tag).split("}", 1)[-1]


def _emu_to_pixels(value) -> int | None:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        return None
    return max(1, round(numeric / 9525))


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
        return _save_word_document(current_content, payload)
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

_THEME_COLOR_NAME_TO_INDEX = {
    "dk1": 0,
    "lt1": 1,
    "dk2": 2,
    "lt2": 3,
    "accent1": 4,
    "accent2": 5,
    "accent3": 6,
    "accent4": 7,
    "accent5": 8,
    "accent6": 9,
    "hlink": 10,
    "folHlink": 11,
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


def _extract_xml_color(color_parent, theme_element=None) -> str | None:
    if color_parent is None:
        return None

    srgb = color_parent.find("./a:srgbClr", OOXML_NAMESPACES)
    if srgb is not None:
        return _normalize_hex_color(srgb.get("val"))

    sys_color = color_parent.find("./a:sysClr", OOXML_NAMESPACES)
    if sys_color is not None:
        return _normalize_hex_color(sys_color.get("lastClr"))

    scheme_color = color_parent.find("./a:schemeClr", OOXML_NAMESPACES)
    if scheme_color is not None:
        theme_slot = (scheme_color.get("val") or "").strip()
        theme_index = _THEME_COLOR_NAME_TO_INDEX.get(theme_slot)
        if theme_index is not None:
            return _resolve_theme_from_xml(theme_element, theme_index) or _THEME_COLOR_FALLBACKS.get(theme_index)

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


def _normalize_hex_color(value) -> str | None:
    if value is None:
        return None

    normalized = str(value).strip().lstrip("#").upper()
    if len(normalized) == 8:
        normalized = normalized[2:]
    if re.fullmatch(r"[0-9A-F]{6}", normalized):
        return normalized
    return None


def _normalize_word_run_payload(run: dict | None) -> dict:
    run = run or {}
    normalized: dict = {"text": str(run.get("text") or "")}

    if run.get("bold") is True:
        normalized["bold"] = True
    if run.get("italic") is True:
        normalized["italic"] = True
    if run.get("underline") is True:
        normalized["underline"] = True

    font_size = run.get("fontSize")
    if isinstance(font_size, (int, float)):
        normalized["fontSize"] = round(float(font_size), 1)

    color = _normalize_hex_color(run.get("color"))
    if color:
        normalized["color"] = color

    return normalized


def _normalize_word_paragraph_payload(paragraph: dict | None) -> dict:
    paragraph = paragraph or {}
    normalized: dict = {"text": str(paragraph.get("text") or "")}

    runs = [_normalize_word_run_payload(run) for run in paragraph.get("runs") or []]
    if runs:
        normalized["runs"] = runs

    style = paragraph.get("style")
    if style in {"title", "subtitle", "heading1", "heading2", "heading3", "heading4", "list"}:
        normalized["style"] = style

    alignment = paragraph.get("alignment")
    if alignment in {"left", "center", "right", "justify"}:
        normalized["alignment"] = alignment

    return normalized


def _normalize_word_table_cell_payload(cell: dict | None) -> dict:
    cell = cell or {}
    normalized: dict = {"text": str(cell.get("text") or "")}
    runs = [_normalize_word_run_payload(run) for run in cell.get("runs") or []]
    if runs:
        normalized["runs"] = runs
    return normalized


def _normalize_word_table_payload(table: dict | None) -> dict:
    table = table or {}
    rows = []
    for row in table.get("rows") or []:
        rows.append([_normalize_word_table_cell_payload(cell) for cell in row or []])

    return {"rows": rows or [[{"text": ""}]]}


def _normalize_word_blocks_payload(blocks: list[dict] | None, paragraph_count: int, table_count: int) -> list[dict]:
    normalized: list[dict] = []
    seen_paragraphs: set[int] = set()
    seen_tables: set[int] = set()

    for block in blocks or []:
        block_type = (block or {}).get("type")
        index = (block or {}).get("index")
        if not isinstance(index, int):
            continue

        if block_type == "paragraph" and 0 <= index < paragraph_count and index not in seen_paragraphs:
            normalized.append({"type": "paragraph", "index": index})
            seen_paragraphs.add(index)
        elif block_type == "table" and 0 <= index < table_count and index not in seen_tables:
            normalized.append({"type": "table", "index": index})
            seen_tables.add(index)

    for index in range(paragraph_count):
        if index not in seen_paragraphs:
            normalized.append({"type": "paragraph", "index": index})
    for index in range(table_count):
        if index not in seen_tables:
            normalized.append({"type": "table", "index": index})

    if not normalized:
        normalized.append({"type": "paragraph", "index": 0})

    return normalized


def _map_word_alignment(alignment) -> str | None:
    alignment_map = {
        WD_ALIGN_PARAGRAPH.LEFT: "left",
        WD_ALIGN_PARAGRAPH.CENTER: "center",
        WD_ALIGN_PARAGRAPH.RIGHT: "right",
        WD_ALIGN_PARAGRAPH.JUSTIFY: "justify",
    }
    direct = alignment_map.get(alignment)
    if direct:
        return direct

    alignment_name = getattr(alignment, "name", None)
    if not alignment_name and alignment is not None:
        alignment_name = str(alignment)

    normalized = str(alignment_name or "").strip().lower()
    aliases = {
        "start": "left",
        "end": "right",
        "distribute": "justify",
        "thai_distribute": "justify",
        "medium_kashida": "justify",
        "high_kashida": "justify",
        "low_kashida": "justify",
        "just_low": "justify",
        "just_med": "justify",
        "just_hi": "justify",
    }
    return aliases.get(normalized)


def _word_alignment_enum(alignment: str | None):
    mapping = {
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
    }
    return mapping.get(alignment)


def _word_style_name(style: str | None) -> str | None:
    mapping = {
        "title": "Title",
        "subtitle": "Subtitle",
        "heading1": "Heading 1",
        "heading2": "Heading 2",
        "heading3": "Heading 3",
        "heading4": "Heading 4",
        "list": "List Paragraph",
    }
    return mapping.get(style)


def _extract_word_paragraph(paragraph, theme_element=None) -> dict:
    paragraph_payload: dict = {"text": paragraph.text}

    style = _map_word_style(getattr(getattr(paragraph, "style", None), "name", ""))
    if style:
        paragraph_payload["style"] = style

    alignment = _map_word_alignment(paragraph.alignment)
    if alignment:
        paragraph_payload["alignment"] = alignment

    runs = _extract_word_runs(paragraph, theme_element)
    if runs:
        paragraph_payload["runs"] = runs

    return paragraph_payload


def _extract_word_run_payload(run, theme_element=None) -> dict:
    run_payload = {"text": run.text or ""}

    if run.bold is True:
        run_payload["bold"] = True
    if run.italic is True:
        run_payload["italic"] = True
    if run.underline is True:
        run_payload["underline"] = True
    if run.font.size is not None:
        run_payload["fontSize"] = round(run.font.size.pt, 1)

    color = _safe_color_rgb(run.font.color, theme_element)
    if color:
        run_payload["color"] = color

    return run_payload


def _append_word_text_item(items: list[dict], run_payload: dict, text: str) -> None:
    if not text:
        return

    item = {"type": "text", "text": text}
    for key in ("bold", "italic", "underline", "fontSize", "color"):
        if key in run_payload:
            item[key] = run_payload[key]
    items.append(item)


def _extract_word_anchor_wrap(anchor_element) -> str | None:
    if anchor_element is None:
        return None

    if anchor_element.get("behindDoc") == "1":
        return "behindText"

    wrap_map = {
        "wrapSquare": "square",
        "wrapTight": "tight",
        "wrapThrough": "tight",
        "wrapTopAndBottom": "topAndBottom",
        "wrapNone": "none",
    }

    for child in list(anchor_element):
        wrap_value = wrap_map.get(_local_name(child.tag))
        if wrap_value:
            return wrap_value

    return None


def _extract_word_anchor_alignment(position_element) -> str | None:
    if position_element is None:
        return None

    align_element = position_element.find("./wp:align", OOXML_NAMESPACES)
    if align_element is None:
        return None

    normalized = (align_element.text or "").strip().lower()
    return {
        "left": "left",
        "inside": "left",
        "center": "center",
        "right": "right",
        "outside": "right",
    }.get(normalized)


def _extract_word_anchor_offset(position_element) -> int | None:
    if position_element is None:
        return None

    pos_offset = position_element.find("./wp:posOffset", OOXML_NAMESPACES)
    if pos_offset is None:
        return None

    try:
        return int(round(int(pos_offset.text or "0") / 9525))
    except (TypeError, ValueError):
        return None


def _extract_word_anchor_metadata(anchor_element) -> dict:
    if anchor_element is None:
        return {}

    position_h = anchor_element.find("./wp:positionH", OOXML_NAMESPACES)
    position_v = anchor_element.find("./wp:positionV", OOXML_NAMESPACES)

    metadata = {"placement": "floating"}
    alignment = _extract_word_anchor_alignment(position_h)
    if alignment:
        metadata["align"] = alignment

    wrap = _extract_word_anchor_wrap(anchor_element)
    if wrap:
        metadata["wrap"] = wrap

    offset_x = _extract_word_anchor_offset(position_h)
    if offset_x is not None:
        metadata["offsetX"] = offset_x

    offset_y = _extract_word_anchor_offset(position_v)
    if offset_y is not None:
        metadata["offsetY"] = offset_y

    return metadata


def _extract_word_drawing_images(drawing_element, image_map: dict[str, dict]) -> tuple[list[dict], set[str]]:
    images: list[dict] = []
    rel_ids: set[str] = set()

    anchor = drawing_element.find(".//wp:anchor", OOXML_NAMESPACES)
    placement = "block" if anchor is not None else "inline"
    extent = drawing_element.find(".//wp:extent", OOXML_NAMESPACES)
    doc_properties = drawing_element.find(".//wp:docPr", OOXML_NAMESPACES)
    anchor_metadata = _extract_word_anchor_metadata(anchor)

    width = _emu_to_pixels(extent.get("cx")) if extent is not None else None
    height = _emu_to_pixels(extent.get("cy")) if extent is not None else None
    name = None
    alt_text = None

    if doc_properties is not None:
        name = (doc_properties.get("name") or "").strip() or None
        alt_text = (doc_properties.get("descr") or "").strip() or None

    for blip in drawing_element.findall(".//a:blip", OOXML_NAMESPACES):
        rel_id = blip.get(f"{{{OOXML_NAMESPACES['r']}}}embed") or blip.get(f"{{{OOXML_NAMESPACES['r']}}}link")
        if not rel_id or rel_id not in image_map:
            continue

        rel_ids.add(rel_id)
        image_payload = {"type": "image", **image_map[rel_id], "placement": placement}
        if width is not None:
            image_payload["width"] = width
        if height is not None:
            image_payload["height"] = height
        if name:
            image_payload["name"] = name
        if alt_text:
            image_payload["altText"] = alt_text
        if anchor_metadata:
            image_payload.update(anchor_metadata)
        images.append(image_payload)

    return images, rel_ids


def _extract_word_paragraph_content(paragraph, theme_element=None, image_map: dict[str, dict] | None = None) -> tuple[list[dict] | None, set[str]]:
    if not image_map:
        return None, set()

    items: list[dict] = []
    rel_ids: set[str] = set()
    has_images = False

    for run in paragraph.runs:
        run_payload = _extract_word_run_payload(run, theme_element)
        run_children = list(run._element)
        if not run_children:
            _append_word_text_item(items, run_payload, run_payload.get("text") or "")
            continue

        pending_text = ""
        appended_text = False

        for child in run_children:
            tag_name = _local_name(child.tag)
            if tag_name == "t":
                pending_text += child.text or ""
            elif tag_name == "tab":
                pending_text += "\t"
            elif tag_name in {"br", "cr"}:
                pending_text += "\n"
            elif tag_name == "drawing":
                if pending_text:
                    _append_word_text_item(items, run_payload, pending_text)
                    appended_text = True
                    pending_text = ""

                image_items, image_rel_ids = _extract_word_drawing_images(child, image_map)
                if image_items:
                    has_images = True
                    items.extend(image_items)
                    rel_ids.update(image_rel_ids)

        if pending_text:
            _append_word_text_item(items, run_payload, pending_text)
            appended_text = True
        elif not appended_text and run_payload.get("text"):
            _append_word_text_item(items, run_payload, run_payload.get("text") or "")

    return (items if has_images else None), rel_ids


def _clear_paragraph_content(paragraph) -> None:
    paragraph.clear()


def _apply_word_run(run, payload: dict) -> None:
    run.bold = payload.get("bold") is True or None
    run.italic = payload.get("italic") is True or None
    run.underline = payload.get("underline") is True or None

    font_size = payload.get("fontSize")
    if isinstance(font_size, (int, float)):
        run.font.size = Pt(float(font_size))

    color = _normalize_hex_color(payload.get("color"))
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def _apply_word_paragraph(paragraph, payload: dict) -> None:
    style_name = _word_style_name(payload.get("style"))
    if style_name:
        try:
            paragraph.style = style_name
        except Exception:
            pass

    alignment = _word_alignment_enum(payload.get("alignment"))
    if alignment is not None:
        paragraph.alignment = alignment

    _clear_paragraph_content(paragraph)

    runs = payload.get("runs") or []
    if runs:
        for run_payload in runs:
            normalized_run = _normalize_word_run_payload(run_payload)
            run = paragraph.add_run(normalized_run.get("text") or "")
            _apply_word_run(run, normalized_run)
        return

    text = str(payload.get("text") or "")
    if text:
        paragraph.add_run(text)


def _extract_word_table_cell(cell, theme_element=None) -> dict:
    cell_payload: dict = {"text": cell.text}
    if cell.paragraphs:
        first_para = cell.paragraphs[0]
        runs = _extract_word_runs(first_para, theme_element)
        if runs:
            cell_payload["runs"] = runs
    return cell_payload


def _rewrite_table_cell(cell, payload: dict) -> None:
    first_paragraph = cell.paragraphs[0] if cell.paragraphs else cell.add_paragraph("")
    _apply_word_paragraph(first_paragraph, payload)

    for paragraph in list(cell.paragraphs[1:]):
        paragraph._element.getparent().remove(paragraph._element)


def _table_column_width(table):
    try:
        width = table.columns[-1].width
        if width is not None:
            return width
    except Exception:
        pass
    return Inches(1.5)


def _ensure_word_table_shape(table, row_count: int, column_count: int) -> None:
    row_count = max(1, row_count)
    column_count = max(1, column_count)

    while len(table.columns) < column_count:
        table.add_column(_table_column_width(table))

    while len(table.rows) < row_count:
        table.add_row()

    while len(table.rows) > row_count:
        table._tbl.remove(table.rows[-1]._tr)


def _apply_word_table(table, payload: dict, theme_element=None) -> None:
    normalized_payload = _normalize_word_table_payload(payload)
    if _normalize_word_table_payload(_extract_word_table(table, theme_element)) == normalized_payload:
        return

    desired_rows = normalized_payload.get("rows") or [[{"text": ""}]]
    desired_column_count = max((len(row) for row in desired_rows), default=1)
    _ensure_word_table_shape(table, len(desired_rows), desired_column_count)

    for row_index, row_payload in enumerate(desired_rows):
        row = table.rows[row_index]
        padded_row = list(row_payload) + [{"text": ""}] * max(0, desired_column_count - len(row_payload))
        for col_index, cell_payload in enumerate(padded_row):
            cell = row.cells[col_index]
            normalized_cell = _normalize_word_table_cell_payload(cell_payload)
            if _normalize_word_table_cell_payload(_extract_word_table_cell(cell, theme_element)) == normalized_cell:
                continue
            _rewrite_table_cell(cell, normalized_cell)


def _iter_word_body_blocks(document) -> list[tuple[str, object]]:
    body = document.element.body
    paragraph_map = {paragraph._element: paragraph for paragraph in document.paragraphs}
    table_map = {table._element: table for table in document.tables}
    blocks: list[tuple[str, object]] = []

    for child in body:
        if child in paragraph_map:
            blocks.append(("paragraph", paragraph_map[child]))
        elif child in table_map:
            blocks.append(("table", table_map[child]))

    return blocks


def _create_word_paragraph(document):
    paragraph = document.add_paragraph("")
    paragraph._element.getparent().remove(paragraph._element)
    return paragraph


def _create_word_table(document, column_count: int):
    table = document.add_table(rows=1, cols=max(1, column_count))
    table._element.getparent().remove(table._element)
    return table


def _reconcile_word_body_blocks(document, blocks: list[dict], tables_payload: list[dict]):
    body = document.element.body
    existing_blocks = _iter_word_body_blocks(document)
    paragraph_pool = [block for block_type, block in existing_blocks if block_type == "paragraph"]
    table_pool = [block for block_type, block in existing_blocks if block_type == "table"]

    paragraph_cursor = 0
    table_cursor = 0
    paragraph_targets = []
    table_targets = []
    desired_elements = []

    for block in blocks:
        if block["type"] == "paragraph":
            if paragraph_cursor < len(paragraph_pool):
                paragraph = paragraph_pool[paragraph_cursor]
                paragraph_cursor += 1
            else:
                paragraph = _create_word_paragraph(document)
            paragraph_targets.append(paragraph)
            desired_elements.append(paragraph._element)
            continue

        table_payload = tables_payload[block["index"]] if block["index"] < len(tables_payload) else {"rows": [[{"text": ""}]]}
        column_count = max((len(row) for row in table_payload.get("rows") or []), default=1)
        if table_cursor < len(table_pool):
            table = table_pool[table_cursor]
            table_cursor += 1
        else:
            table = _create_word_table(document, column_count)
        table_targets.append(table)
        desired_elements.append(table._element)

    placed_element_ids: set[int] = set()
    desired_queue = list(desired_elements)
    existing_element_ids = {id(block._element) for _, block in existing_blocks}

    for child in list(body):
        if child.getparent() is not body:
            continue
        if id(child) in placed_element_ids:
            continue
        if id(child) not in existing_element_ids:
            continue

        if desired_queue:
            replacement = desired_queue.pop(0)
            placed_element_ids.add(id(replacement))
            if replacement is child:
                continue
            child.addprevious(replacement)
        body.remove(child)

    sect_pr = body.sectPr
    for element in desired_queue:
        if sect_pr is not None:
            sect_pr.addprevious(element)
        else:
            body.append(element)

    return paragraph_targets, table_targets


def _extract_word_runs(paragraph, theme_element=None) -> list[dict] | None:
    runs = []
    has_formatting = False

    for run in paragraph.runs:
        run_payload = _extract_word_run_payload(run, theme_element)
        if any(key != "text" for key in run_payload):
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
            cells.append(_extract_word_table_cell(cell, theme_element))
        rows.append(cells)
    return {"rows": rows}


def _build_word_image_map(document) -> dict[str, dict]:
    image_map: dict[str, dict] = {}
    try:
        for rel_id, rel in document.part.rels.items():
            if "image" not in (rel.reltype or ""):
                continue

            blob = rel.target_part.blob
            content_type = getattr(rel.target_part, "content_type", "image/png")
            encoded = base64.b64encode(blob).decode("ascii")
            image_map[str(rel_id)] = {
                "contentType": content_type,
                "dataUri": f"data:{content_type};base64,{encoded}",
            }
    except Exception:
        pass
    return image_map


def _list_word_orphan_images(image_map: dict[str, dict], placed_rel_ids: set[str]) -> list[dict]:
    return [payload for rel_id, payload in image_map.items() if rel_id not in placed_rel_ids]


def _load_word_document(content: bytes) -> dict:
    document = Document(BytesIO(content))
    theme_element = _get_theme_element_from_docx(document)
    image_map = _build_word_image_map(document)
    placed_image_rel_ids: set[str] = set()

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
            paragraph_payload = _extract_word_paragraph(para, theme_element)
            paragraph_content, paragraph_rel_ids = _extract_word_paragraph_content(para, theme_element, image_map)
            if paragraph_content:
                paragraph_payload["content"] = paragraph_content
                placed_image_rel_ids.update(paragraph_rel_ids)
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
    images = _list_word_orphan_images(image_map, placed_image_rel_ids)

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


def _save_word_document(current_content: bytes, payload: dict) -> bytes:
    document = Document(BytesIO(current_content))
    theme_element = _get_theme_element_from_docx(document)

    paragraphs = [_normalize_word_paragraph_payload(paragraph) for paragraph in payload.get("paragraphs") or [{"text": ""}]]
    tables = [_normalize_word_table_payload(table) for table in payload.get("tables") or []]
    blocks = _normalize_word_blocks_payload(payload.get("blocks"), len(paragraphs), len(tables))

    paragraph_targets, table_targets = _reconcile_word_body_blocks(document, blocks, tables)

    while len(paragraph_targets) < len(paragraphs):
        paragraph_targets.append(_create_word_paragraph(document))
    while len(table_targets) < len(tables):
        column_count = max((len(row) for row in tables[len(table_targets)].get("rows") or []), default=1)
        table_targets.append(_create_word_table(document, column_count))

    for paragraph, target in zip(paragraphs, paragraph_targets):
        if _normalize_word_paragraph_payload(_extract_word_paragraph(target, theme_element)) == paragraph:
            continue
        _apply_word_paragraph(target, paragraph)

    for table_payload, target in zip(tables, table_targets):
        _apply_word_table(target, table_payload, theme_element)

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


def _extract_presentation_picture(shape, slide_width: float, slide_height: float) -> dict | None:
    try:
        image = shape.image
        blob = image.blob
        content_type = getattr(image, "content_type", "image/png")
    except Exception:
        return None

    encoded = base64.b64encode(blob).decode("ascii")
    picture_payload: dict = {
        "index": 0,
        "name": shape.name or "Picture",
        "contentType": content_type,
        "dataUri": f"data:{content_type};base64,{encoded}",
        "left": round(float(Emu(shape.left)) / slide_width * 100, 1),
        "top": round(float(Emu(shape.top)) / slide_height * 100, 1),
        "width": round(float(Emu(shape.width)) / slide_width * 100, 1),
        "height": round(float(Emu(shape.height)) / slide_height * 100, 1),
    }

    alt_text = getattr(shape, "alt_text", None)
    if alt_text:
        picture_payload["altText"] = alt_text

    for crop_key in ("crop_left", "crop_right", "crop_top", "crop_bottom"):
        try:
            crop_value = getattr(shape, crop_key)
        except Exception:
            crop_value = None

        if isinstance(crop_value, (int, float)) and crop_value:
            camel_key = re.sub(r"_([a-z])", lambda match: match.group(1).upper(), crop_key)
            picture_payload[camel_key] = round(float(crop_value), 4)

    rotation = getattr(shape, "rotation", None)
    if isinstance(rotation, (int, float)) and rotation:
        picture_payload["rotation"] = round(float(rotation), 1)

    return picture_payload


def _extract_related_image_payload(part, rel_id: str) -> dict | None:
    try:
        related_part = part.related_parts[rel_id]
        blob = related_part.blob
        content_type = getattr(related_part, "content_type", "image/png")
    except Exception:
        return None

    encoded = base64.b64encode(blob).decode("ascii")
    return {
        "contentType": content_type,
        "dataUri": f"data:{content_type};base64,{encoded}",
    }


def _extract_gradient_preview_color(gradient_fill, theme_element=None) -> str | None:
    if gradient_fill is None:
        return None

    for gradient_stop in gradient_fill.findall("./a:gsLst/a:gs", OOXML_NAMESPACES):
        color = _extract_xml_color(gradient_stop, theme_element)
        if color:
            return color

    return None


def _extract_presentation_background_payload(source, theme_element=None) -> dict | None:
    bg = getattr(getattr(source, "_element", None), "bg", None)
    if bg is None:
        return None

    bg_pr = getattr(bg, "bgPr", None) or bg.find("./p:bgPr", OOXML_NAMESPACES)
    if bg_pr is None:
        return None

    payload: dict = {}

    solid_fill = bg_pr.find("./a:solidFill", OOXML_NAMESPACES)
    solid_color = _extract_xml_color(solid_fill, theme_element)
    if solid_color:
        payload["backgroundColor"] = solid_color
    else:
        gradient_color = _extract_gradient_preview_color(bg_pr.find("./a:gradFill", OOXML_NAMESPACES), theme_element)
        if gradient_color:
            payload["backgroundColor"] = gradient_color

    blip_fill = bg_pr.find("./a:blipFill", OOXML_NAMESPACES)
    if blip_fill is not None:
        blip = blip_fill.find("./a:blip", OOXML_NAMESPACES)
        rel_id = None if blip is None else (
            blip.get(f"{{{OOXML_NAMESPACES['r']}}}embed")
            or blip.get(f"{{{OOXML_NAMESPACES['r']}}}link")
        )
        if rel_id:
            background_image = _extract_related_image_payload(source.part, rel_id)
            if background_image:
                payload["backgroundImage"] = background_image

    return payload or None


def _resolve_presentation_background(slide, theme_element=None) -> dict | None:
    sources = [slide]

    try:
        sources.append(slide.slide_layout)
    except Exception:
        pass

    try:
        sources.append(slide.slide_layout.slide_master)
    except Exception:
        pass

    for source in sources:
        payload = _extract_presentation_background_payload(source, theme_element)
        if payload:
            return payload

    return None


def _load_presentation(content: bytes) -> dict:
    presentation = Presentation(BytesIO(content))
    theme_element = _get_theme_element_from_pptx(presentation)
    slides = []
    slide_width = float(Emu(presentation.slide_width)) or 1.0
    slide_height = float(Emu(presentation.slide_height)) or 1.0

    for slide in presentation.slides:
        background_payload = _resolve_presentation_background(slide, theme_element)
        title_text = ""
        title_shape = slide.shapes.title if slide.shapes.title else None
        title_runs = None
        if title_shape is not None and getattr(title_shape, "has_text_frame", False):
            title_text = title_shape.text_frame.text
            extracted_title_runs = _extract_presentation_runs(title_shape.text_frame, theme_element)
            title_runs = extracted_title_runs or None

        shapes = []
        images = []
        for shape_index, shape in enumerate(slide.shapes):
            picture_payload = _extract_presentation_picture(shape, slide_width, slide_height)
            if picture_payload:
                picture_payload["index"] = shape_index
                images.append(picture_payload)
                continue

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
        if background_payload:
            slide_payload.update(background_payload)
        if title_runs:
            slide_payload["titleRuns"] = title_runs
        if images:
            slide_payload["images"] = images
        slides.append(slide_payload)

    if not slides:
        slides = [{"title": "", "shapes": []}]

    result: dict = {
        "kind": "presentation",
        "format": "pptx",
        "slides": slides,
    }

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