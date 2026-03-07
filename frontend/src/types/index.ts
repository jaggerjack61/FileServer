export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  is_superuser?: boolean;
  tenant: Tenant | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  storage_quota: number;
  storage_used: number;
  is_active: boolean;
  created_at: string;
}

export interface FileItem {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  thumbnail_url?: string | null;
  parent_folder: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  owner: { id: string; email: string; username: string };
  download_url: string;
}

export interface OfficeWordRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
}

export interface OfficeWordParagraph {
  text: string;
  runs?: OfficeWordRun[];
  alignment?: 'left' | 'center' | 'right' | 'justify';
  style?: string;
}

export interface OfficeWordTableCell {
  text: string;
  runs?: OfficeWordRun[];
}

export interface OfficeWordTable {
  rows: OfficeWordTableCell[][];
}

export interface OfficeWordBlock {
  type: 'paragraph' | 'table';
  index: number;
}

export interface OfficeEmbeddedImage {
  contentType: string;
  dataUri: string;
}

export interface OfficeWordContent {
  kind: 'word';
  format: 'docx';
  paragraphs: OfficeWordParagraph[];
  tables?: OfficeWordTable[];
  blocks?: OfficeWordBlock[];
  images?: OfficeEmbeddedImage[];
}

export interface OfficeSpreadsheetCell {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bgColor?: string;
  fontSize?: number;
  align?: string;
}

export interface OfficeSpreadsheetSheet {
  name: string;
  rows: string[][];
  cells?: Record<string, OfficeSpreadsheetCell>;
  mergedCells?: number[][];
  columnWidths?: Array<number | null>;
}

export interface OfficeSpreadsheetContent {
  kind: 'spreadsheet';
  format: 'xlsx';
  sheets: OfficeSpreadsheetSheet[];
}

export interface OfficePresentationRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  color?: string;
}

export interface OfficePresentationShape {
  index: number;
  name: string;
  text: string;
  runs?: OfficePresentationRun[];
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

export interface OfficePresentationSlide {
  title: string;
  shapes: OfficePresentationShape[];
  titleRuns?: OfficePresentationRun[];
}

export interface OfficePresentationContent {
  kind: 'presentation';
  format: 'pptx';
  slides: OfficePresentationSlide[];
  images?: OfficeEmbeddedImage[];
}

export type OfficeContent = OfficeWordContent | OfficeSpreadsheetContent | OfficePresentationContent;

export interface FileCompressResponse {
  archive: FileItem;
}

export interface FileExtractResponse {
  extracted: number;
  folder_id: string;
  folder_name: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface Folder {
  id: string;
  name: string;
  parent: string | null;
  created_at: string;
  updated_at: string;
  owner: { id: string; email: string; username: string };
  children?: Folder[];
  files?: FileItem[];
  breadcrumbs?: BreadcrumbItem[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  created: string;
  last_used: string | null;
  revoked: boolean;
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  created: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface StorageMetrics {
  total_tenants: number;
  total_files: number;
  total_storage_used: number;
  total_storage_quota: number;
  usage_percentage: number;
  tenants: Array<{
    id: string;
    name: string;
    storage_used: number;
    storage_quota: number;
    file_count: number;
  }>;
}

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_users: number;
  total_users: number;
  total_files: number;
  total_deleted_files: number;
  total_tenants: number;
  active_tenants: number;
  uptime: string;
}

export interface TenantAdmin {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  storage_quota: number;
  storage_used: number;
  is_active: boolean;
  member_count: number;
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  action: 'upload' | 'delete';
  filename: string;
  file_size: number;
  user: string;
  tenant: string;
  timestamp: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  tenant_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
