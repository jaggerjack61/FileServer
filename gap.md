# DOCX Viewer/Editor Gap Analysis

## Scope

This document reviews the current `.docx` viewer/editor in this repository and defines the specification required to reach practical parity with Microsoft Word or Google Docs.

Files reviewed:

- `backend/apps/files/office.py`
- `backend/apps/files/views.py`
- `backend/apps/files/serializers.py`
- `frontend/src/components/files/OfficeEditor.tsx`
- `frontend/src/components/files/FilePreview.tsx`
- `frontend/src/features/files/OfficeEditorPage.tsx`
- `frontend/src/types/index.ts`
- `README.md`

## Executive Summary

The current implementation is a lightweight local office viewer/editor. It can open `.docx` files, extract a simplified JSON representation, render a readable document view, and save paragraph text changes back into a new `.docx` file.

It is not close to Word or Google Docs parity.

The largest functional gap is that Word save is lossy by design: saving rebuilds a brand new document from plain paragraph text only. That means formatting, tables, images, document structure, and most Word features are not preserved after edit/save.

If the target is true Word/Google Docs equivalence, the current custom JSON abstraction is the wrong foundation. The practical path is to integrate a mature office engine such as OnlyOffice Docs or Collabora Online, or to build a much richer OOXML-backed editor architecture.

## Implementation Status After March 2026 Upgrade

Closed in this pass:

- Word save now uses the original DOCX package as the base document instead of rebuilding a fresh document from plain paragraphs.
- Paragraphs, tables, block ordering, and embedded media are preserved across save when left untouched.
- Real-world alignment aliases such as `start` and `end` no longer break document loading.
- Office content save now performs deeper payload validation before write-back.
- The document viewer/editor is now split into smaller frontend modules instead of one monolithic file.
- Word edit mode now supports block-level paragraph styling, alignment changes, structured run editing, and table cell editing with row/column controls.
- The Word surface now includes a simplified toolbar, document map, page-like rendering, and preserved media shelf.

Still open after this pass:

- true cursor-range rich text editing
- inline/floating image placement editing
- page-accurate layout and pagination
- merge/split cells and advanced table formatting
- comments, tracked changes, version history, and collaboration
- OOXML-preserving support for headers, footers, sections, fields, charts, shapes, and other advanced Word features

Conclusion:

- Phase 1 goals are materially addressed.
- Phase 2 is partially addressed.
- Phase 3 and Phase 4 remain out of scope for the current custom editor architecture.

## What Is Present Today

### Backend

- `.docx` detection exists via file extension and MIME type.
- `GET /api/files/{id}/office-content/` loads office content for supported files.
- `PUT /api/files/{id}/office-content/` saves office content back to storage.
- Office preview size is capped by `OFFICE_PREVIEW_MAX_FILE_SIZE`.
- Word loader extracts:
  - paragraph text
  - limited paragraph style mapping: `title`, `subtitle`, `heading1`-`heading4`, `list`
  - limited paragraph alignment mapping: `left`, `center`, `right`, `justify`
  - limited run formatting: `bold`, `italic`, `underline`, `fontSize`, `color`
  - tables
  - embedded images
  - block order for paragraphs and tables in read-only mode

### Frontend

- A modal preview can open office files and route to a dedicated office page.
- A dedicated `/office/:fileId` page exists.
- Read-only rendering presents a page-like document surface.
- Paragraph rich text is visually rendered from extracted runs.
- Tables render in read-only mode.
- Embedded images render in read-only mode as a separate image gallery.
- Edit mode supports:
  - paragraph text editing through textareas
  - add paragraph
  - remove paragraph
  - save and cancel
  - download original/updated file

### Product-Level Reality

- The system already provides a basic internal document reader/editor.
- It is suitable for simple text corrections in plain or lightly formatted documents.
- It is not suitable for high-fidelity office authoring, legal documents, templates, branded documents, collaborative editing, or review workflows.

## Critical Gaps In The Current DOCX Implementation

### 1. Save Is Lossy

Current behavior:

- Word save creates a new `Document()` and writes only paragraph text.
- The original OOXML structure is not preserved.
- The `current_content` input is not used for Word save.

Impact:

- character formatting is lost
- paragraph formatting is lost
- custom styles are lost
- tables are lost on save
- images are lost on save
- document order is lost
- page setup is lost
- headers and footers are lost
- section breaks are lost
- hyperlinks, bookmarks, fields, comments, revisions, and metadata are lost

This is the main blocker for parity.

### 2. Editing Model Covers Only Plain Paragraph Text

Current behavior:

- edit mode uses one textarea per paragraph
- there is no inline selection model
- there is no toolbar for formatting
- there is no cursor-aware rich text editing

Impact:

- users cannot apply or modify bold, italic, underline, font size, color, alignment, indentation, line spacing, bullets, numbering, or styles
- users cannot edit text runs without flattening the paragraph into plain text
- the editor cannot support Word-like keyboard shortcuts or direct formatting workflows

### 3. Document Structure Is Only Partially Modeled

Current behavior:

- paragraphs and tables are modeled
- tables are rendered read-only
- images are extracted separately, not preserved inline in document flow
- style mapping is intentionally narrow

Missing structure:

- sections
- headers
- footers
- footnotes
- endnotes
- page breaks
- section breaks
- columns
- page margins
- page size/orientation
- list numbering definitions
- hyperlinks
- bookmarks
- cross-references
- fields and content controls
- comments
- track changes markup
- citations, bibliography, TOC, indexes
- shapes, text boxes, charts, SmartArt, diagrams, equations
- floating and anchored objects

### 4. Rendering Fidelity Is Far Below Word/Docs

Current behavior:

- the page surface is a styled container, not a layout engine
- images are shown in a gallery instead of inline at their original positions
- tables only expose basic cell text
- only a small subset of styles and alignment are rendered

Missing fidelity requirements:

- accurate page pagination
- widow/orphan and page break behavior
- true list numbering and nesting
- tab stops
- paragraph spacing rules
- text wrapping around images/shapes
- header/footer rendering
- section-specific page settings
- footnotes/endnotes layout
- tracked change markup
- comment anchors and side comments

### 5. Tables Are View-Only And Simplified

Current behavior:

- tables are extracted and shown in read-only mode
- only first-paragraph formatting per cell is partially represented
- edit mode does not expose table editing
- Word save does not write tables back

Missing table capabilities:

- add/remove rows and columns
- merge/split cells
- cell borders, shading, vertical alignment
- cell margins and widths
- multiple paragraphs per cell
- nested tables
- table styles
- repeating header rows
- table positioning and wrapping

### 6. Images And Objects Are Not Editable

Current behavior:

- embedded images are extracted to a list and displayed below the document
- no inline image placement is preserved
- no image editing UI exists
- no image write-back exists for Word save

Missing object capabilities:

- inline images in document flow
- floating images with anchors and wrap modes
- resize/crop/replace image
- captions and alt text
- text boxes
- shapes
- charts
- equations
- drawing canvas objects

### 7. Compatibility Is Not Robust

Observed evidence:

- the audit log contains repeated failures loading a document because of `WD_PARAGRAPH_ALIGNMENT has no XML mapping for 'start'`

Implications:

- the parser does not robustly handle all real-world Word alignment values
- document loading fails on at least some valid `.docx` files
- format coverage is not production-grade yet

### 8. No Collaboration, Review, Or Concurrency Controls

Current behavior:

- the entire content payload is loaded and saved as one JSON blob
- there is no locking, version token, operational transform, or CRDT layer
- there are no comments, suggestions, approvals, or review workflows
- there is no multi-user presence or live cursor support

Missing collaboration requirements:

- real-time coauthoring
- per-user presence and cursor indicators
- conflict detection and merge strategy
- autosave with revision checkpoints
- version history and restore
- comments and threaded replies
- suggestion mode / track changes
- accept/reject changes
- mentions and notifications

### 9. Validation And Data Contracts Are Too Weak

Current behavior:

- office content save uses a generic JSON field
- there is no deep schema validation for document structure

Impact:

- malformed payloads can reach save logic
- document corruption risks are higher
- backward/forward compatibility of the API contract is not defined

### 10. No Word/Docs-Grade Authoring UX

Missing UX expected for parity:

- toolbar and ribbon actions
- keyboard shortcuts
- rulers and margin controls
- style picker
- font picker and paragraph controls
- insert menu
- right-click context menus
- outline/navigation pane
- find/replace
- spellcheck and grammar suggestions
- accessibility checker
- print preview
- export/share workflow

## Gap To Word / Google Docs By Capability Area

### A. File Fidelity

Current state:

- simplified extraction
- lossy save

Parity requirement:

- opening and saving a document without edits must preserve the document semantically and visually
- unsupported features must be preserved round-trip, not discarded
- the editor must maintain OOXML parts it does not actively edit

### B. Document Layout

Current state:

- page-like container only

Parity requirement:

- page-aware rendering engine with pagination, margins, sections, headers/footers, breaks, footnotes/endnotes, list layout, and object wrapping

### C. Rich Text Editing

Current state:

- plain textarea paragraph editing only

Parity requirement:

- selection/range-based editor with inline formatting, block formatting, lists, styles, hyperlinks, paste handling, undo/redo, and keyboard shortcuts

### D. Embedded Content

Current state:

- tables read-only, images read-only and detached from flow

Parity requirement:

- editable tables, inline/floating images, shapes, charts, text boxes, fields, and equations with lossless write-back

### E. Review And Collaboration

Current state:

- none

Parity requirement:

- real-time coauthoring, comments, suggestions, revision history, compare/merge, accept/reject changes, and presence indicators

### F. Platform And Operations

Current state:

- whole-document GET/PUT API, size limit, file-level save

Parity requirement:

- session-aware editing, autosave, optimistic concurrency or lock tokens, background save recovery, audit trail, retention/versioning, and compatibility regression testing

## Required Specification For Word/Google Docs Parity

The following is the minimum serious specification if the product goal is to say the system matches Word or Google Docs for `.docx` documents.

### 1. Document Model

The system must support a full internal model for Word documents that includes:

- document metadata
- styles and style inheritance
- sections and page setup
- paragraphs and runs
- numbering definitions and list instances
- tables with full cell structure and formatting
- headers and footers
- footnotes and endnotes
- hyperlinks, bookmarks, references, and fields
- images, drawings, text boxes, charts, and shapes
- comments and revision markup
- tracked insertion, deletion, and formatting changes
- content controls and template fields where applicable

Acceptance criteria:

- open-save with no edits preserves all supported structures
- unsupported structures are preserved pass-through in OOXML
- the model supports deterministic serialization back to `.docx`

### 2. Rendering Engine

The viewer must render the document with page-aware fidelity, including:

- real page boundaries
- correct margins and rulers
- paragraph spacing and tab stops
- list numbering and indentation
- section-specific layout
- headers/footers
- footnotes/endnotes
- inline and floating object placement
- comment anchors and revision marks

Acceptance criteria:

- visual output is materially consistent with Word for a regression suite of representative documents
- large documents remain usable without layout corruption

### 3. Editing Engine

The editor must support:

- inline text selection and editing
- direct formatting
- paragraph formatting
- style application
- list creation and editing
- hyperlinks
- find/replace
- undo/redo
- clipboard paste from Word/Docs with formatting retention where feasible
- drag/drop or menu insertion for images, tables, breaks, and links

Acceptance criteria:

- edits do not flatten rich text into plain paragraphs
- formatting edits are preserved after save/reload
- tables and images remain intact after text edits elsewhere in the document

### 4. Table Editing

The system must support:

- create/delete table
- insert/delete row and column
- merge and split cells
- cell text editing with multiple paragraphs
- cell formatting, shading, and borders
- width, alignment, and repeating header rows

Acceptance criteria:

- edited tables round-trip through `.docx` without structural loss

### 5. Image And Object Editing

The system must support:

- insert image
- replace image
- resize and position image
- alt text and captions
- inline and floating wrap options
- preserve existing objects even when not editable in the UI

Acceptance criteria:

- images stay in original document positions after save
- unsupported object types are preserved, not dropped

### 6. Review Features

The system must support:

- comments anchored to ranges
- threaded replies
- suggestion mode / tracked changes
- accept/reject individual and bulk changes
- compare versions
- revision history snapshots

Acceptance criteria:

- multiple reviewers can annotate and review without damaging the base document

### 7. Collaboration Features

The system must support:

- multi-user live editing
- cursor and selection presence
- conflict-free concurrent operations
- autosave and reconnect recovery
- document locking rules for destructive operations

Acceptance criteria:

- concurrent editors do not overwrite each other with last-write-wins behavior

### 8. API And Persistence

The backend must provide:

- session creation and document capability negotiation
- incremental operations or patch-based saves, not only whole-document replacement
- optimistic concurrency version IDs or lock tokens
- autosave endpoints
- revision/version storage
- recoverable save pipeline
- strict schema validation for document payloads
- compatibility-safe storage of OOXML parts

Acceptance criteria:

- save failures cannot silently corrupt a document
- stale clients are detected and handled explicitly

### 9. Compatibility And QA

The product must include:

- a corpus of real-world `.docx` fixtures
- regression tests for open, render, edit, save, reopen
- round-trip fidelity checks
- visual diff testing against reference outputs
- compatibility checks for Word-generated and Google Docs-generated `.docx`
- performance tests for large documents

Acceptance criteria:

- complex documents load consistently
- round-trip defects are measurable and tracked by category

### 10. UX Requirements

The application must provide:

- office-style toolbar/ribbon or a strong simplified equivalent
- keyboard shortcuts consistent with desktop/web editors
- ruler and page tools
- document outline/navigation
- status indicators for save state and collaborators
- comments sidebar
- search and replace UI
- accessible keyboard navigation and screen reader support

Acceptance criteria:

- a user familiar with Word or Google Docs can complete common authoring tasks without dropping to local desktop tools

## Priority Order

If the team wants an implementation roadmap, this is the correct order:

### Phase 1: Stop Data Loss

- preserve original OOXML on save
- make no-op open/save safe
- preserve tables, images, styles, and structure even if not editable
- fix parser compatibility issues such as alignment handling

### Phase 2: Reach Single-User Authoring Competence

- rich text editing
- table editing
- image placement and preservation
- page-aware rendering
- undo/redo, find/replace, styles, lists

### Phase 3: Reach Review Competence

- comments
- track changes
- version history
- compare and restore

### Phase 4: Reach Collaboration Competence

- live coauthoring
- presence
- conflict resolution
- autosave and recovery

## Architectural Recommendation

If the target is truly "match Microsoft Word or Google Docs", do not continue expanding the current paragraph-JSON editor as the primary path.

Recommended options:

- integrate OnlyOffice Docs or Collabora Online for high-fidelity office editing
- use the current custom editor only for lightweight fallback preview/edit scenarios

If a custom implementation is mandatory, the team should explicitly approve a much larger scope that includes:

- a full OOXML-preserving document model
- a layout engine
- a rich text editing engine
- a collaboration engine
- a compatibility and regression program

## Bottom Line

Present today:

- basic `.docx` viewing
- limited rich-text display
- plain paragraph editing
- file save back to `.docx`

Missing for Word/Google Docs parity:

- lossless save
- full document structure support
- true rich text editing
- editable tables/images/objects
- page fidelity
- comments and tracked changes
- version history and collaboration
- robust compatibility guarantees

Until those exist, the system should be described as a basic internal office document viewer/editor, not as a Word- or Google Docs-equivalent editor.