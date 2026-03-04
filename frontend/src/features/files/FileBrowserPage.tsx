import { useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFiles, useUploadFile, useDeleteFile, useRenameFile, useMoveFile, useBulkDeleteFiles, useBulkMoveFiles } from '@/hooks/useFiles';
import { useFolders, useCreateFolder, useDeleteFolder, useUpdateFolder } from '@/hooks/useFolders';
import { useFolder } from '@/hooks/useFolders';
import { fileService } from '@/services/fileService';
import { FileToolbar } from '@/components/files/FileToolbar';
import { FileGrid } from '@/components/files/FileGrid';
import { FileTable } from '@/components/files/FileTable';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { FilePreview } from '@/components/files/FilePreview';
import { FileContextMenu } from '@/components/files/FileContextMenu';
import { MoveFileModal } from '@/components/files/MoveFileModal';
import { FolderCard } from '@/components/folders/FolderCard';
import { FolderRow } from '@/components/folders/FolderRow';
import { FolderContextMenu } from '@/components/folders/FolderContextMenu';
import { CreateFolderModal } from '@/components/folders/CreateFolderModal';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import type { FileItem, Folder } from '@/types';

type ViewMode = 'grid' | 'table';

export function FileBrowserPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const folderId = searchParams.get('folder') || undefined;
  const search = searchParams.get('search') || undefined;

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<Folder | null>(null);
  const [newName, setNewName] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    type: 'file' | 'folder';
    x: number;
    y: number;
    file?: FileItem;
    folder?: Folder;
  } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [moveFile, setMoveFile] = useState<FileItem | null>(null);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const dragCounter = useRef(0);
  const previewObjectUrlRef = useRef<string | null>(null);

  const filesQuery = useFiles({ folderId, search });
  const foldersQuery = useFolders(folderId);
  const folderDetailQuery = useFolder(folderId || '');

  const uploadMutation = useUploadFile();
  const createFolderMutation = useCreateFolder();
  const deleteFileMutation = useDeleteFile();
  const renameFileMutation = useRenameFile();
  const deleteFolderMutation = useDeleteFolder();
  const updateFolderMutation = useUpdateFolder();
  const moveFileMutation = useMoveFile();
  const bulkDeleteMutation = useBulkDeleteFiles();
  const bulkMoveMutation = useBulkMoveFiles();

  const files = filesQuery.data?.results ?? [];
  const folders = foldersQuery.data?.results ?? [];

  // Build breadcrumbs from the folder detail API (ancestor chain)
  const breadcrumbs: { label: string; folderId?: string }[] = [];
  if (folderId && folderDetailQuery.data?.breadcrumbs) {
    for (const crumb of folderDetailQuery.data.breadcrumbs) {
      breadcrumbs.push({ label: crumb.name, folderId: crumb.id });
    }
  } else if (folderId && folderDetailQuery.data) {
    breadcrumbs.push({
      label: folderDetailQuery.data.name,
      folderId: folderDetailQuery.data.id,
    });
  }

  // ---------- Selection helpers ----------
  const toggleFileSelection = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllFiles = useCallback(() => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  }, [files, selectedFiles.size]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // ---------- Upload helpers ----------
  const uploadFilesToFolder = useCallback(
    (uploadFiles: File[], targetFolderId?: string) => {
      uploadFiles.forEach((file) => {
        uploadMutation.mutate({ file, folderId: targetFolderId });
      });
    },
    [uploadMutation]
  );

  const handleUpload = useCallback(
    (uploadFiles: File[]) => {
      uploadFilesToFolder(uploadFiles, folderId);
      setShowUpload(false);
    },
    [uploadFilesToFolder, folderId]
  );

  const handleDropOnFolder = useCallback(
    (folder: Folder, droppedFiles: File[]) => {
      uploadFilesToFolder(droppedFiles, folder.id);
    },
    [uploadFilesToFolder]
  );

  // ---------- Global drag-drop handlers ----------
  const handleGlobalDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  }, []);

  const handleGlobalDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDraggingOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        uploadFilesToFolder(droppedFiles, folderId);
      }
    },
    [uploadFilesToFolder, folderId]
  );

  const handleCreateFolder = (name: string) => {
    createFolderMutation.mutate(
      { name, parent: folderId },
      { onSuccess: () => setShowCreateFolder(false) }
    );
  };

  const handleNavigateFolder = (folder: Folder) => {
    navigate(`/files?folder=${folder.id}`);
  };

  const handleDownload = async (file: FileItem) => {
    const blob = await fileService.download(file.id);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = file.original_filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  };

  const closePreview = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewText(null);
    setPreviewLoading(false);
    setPreviewError(null);
  }, []);

  const openPreview = useCallback(async (file: FileItem) => {
    const previewable =
      file.file_type.startsWith('image/') ||
      file.file_type.startsWith('video/') ||
      file.file_type.startsWith('audio/') ||
      file.file_type === 'application/pdf' ||
      file.file_type.includes('pdf') ||
      file.file_type.startsWith('text/') ||
      file.file_type.includes('json') ||
      file.file_type.includes('xml') ||
      file.file_type.includes('javascript');

    if (!previewable) {
      return;
    }

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewText(null);

    try {
      const blob = await fileService.download(file.id);
      const objectUrl = URL.createObjectURL(blob);
      previewObjectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);

      if (
        file.file_type.startsWith('text/') ||
        file.file_type.includes('json') ||
        file.file_type.includes('xml') ||
        file.file_type.includes('javascript')
      ) {
        const text = await blob.text();
        setPreviewText(text.slice(0, 20000));
      }
    } catch {
      setPreviewError('Unable to load preview for this file.');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleDeleteFile = () => {
    if (deleteFile) {
      deleteFileMutation.mutate(deleteFile.id, {
        onSuccess: () => setDeleteFile(null),
      });
    }
  };

  const handleRenameFile = () => {
    if (renameFile && newName.trim()) {
      renameFileMutation.mutate(
        { id: renameFile.id, filename: newName.trim() },
        { onSuccess: () => { setRenameFile(null); setNewName(''); } }
      );
    }
  };

  const handleDeleteFolder = () => {
    if (deleteFolder) {
      deleteFolderMutation.mutate(deleteFolder.id, {
        onSuccess: () => setDeleteFolder(null),
      });
    }
  };

  const handleRenameFolder = () => {
    if (renameFolder && newName.trim()) {
      updateFolderMutation.mutate(
        { id: renameFolder.id, name: newName.trim() },
        { onSuccess: () => { setRenameFolder(null); setNewName(''); } }
      );
    }
  };

  const handleMoveFile = (targetFolderId: string | null) => {
    if (moveFile) {
      moveFileMutation.mutate(
        { id: moveFile.id, folderId: targetFolderId },
        { onSuccess: () => setMoveFile(null) }
      );
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedFiles);
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedFiles(new Set());
        setShowBulkDelete(false);
      },
    });
  };

  const handleBulkMove = (targetFolderId: string | null) => {
    const ids = Array.from(selectedFiles);
    bulkMoveMutation.mutate(
      { fileIds: ids, folderId: targetFolderId },
      {
        onSuccess: () => {
          setSelectedFiles(new Set());
          setShowBulkMove(false);
        },
      }
    );
  };

  const isLoading = filesQuery.isLoading || foldersQuery.isLoading;

  const handleFileContextMenu = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'file', x: e.clientX, y: e.clientY, file });
  }, []);

  const handleFolderContextMenu = useCallback((e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'folder', x: e.clientX, y: e.clientY, folder });
  }, []);

  return (
    <div
      className="space-y-4 relative"
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      {/* Global drag overlay */}
      {isDraggingOver && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-[1px]">
          <div className="rounded-2xl border-2 border-dashed border-blue-400 bg-white/90 px-12 py-10 shadow-xl text-center">
            <div className="text-blue-500 text-4xl mb-2">📁</div>
            <p className="text-lg font-semibold text-gray-800">Drop files to upload</p>
            <p className="text-sm text-gray-500 mt-1">
              {folderId && folderDetailQuery.data
                ? `Into "${folderDetailQuery.data.name}"`
                : 'Into My Files'}
            </p>
          </div>
        </div>
      )}
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Toolbar */}
      <FileToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onUploadClick={() => setShowUpload(true)}
        onNewFolderClick={() => setShowCreateFolder(true)}
        selectedCount={selectedFiles.size}
        onBulkDelete={() => setShowBulkDelete(true)}
        onBulkMove={() => setShowBulkMove(true)}
        onClearSelection={clearSelection}
      />

      {/* Upload Zone */}
      {showUpload && (
        <FileUploadZone
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
        />
      )}

      {/* Loading */}
      {isLoading && <Spinner className="py-12" size="lg" />}

      {/* Content */}
      {!isLoading && (
        <>
          {/* Folders */}
          {folders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Folders
              </h3>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onClick={() => handleNavigateFolder(folder)}
                      onDelete={() => setDeleteFolder(folder)}
                      onRename={() => {
                        setRenameFolder(folder);
                        setNewName(folder.name);
                      }}
                      onDropFiles={(droppedFiles) => handleDropOnFolder(folder, droppedFiles)}
                      onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modified</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {folders.map((folder) => (
                        <FolderRow
                          key={folder.id}
                          folder={folder}
                          onClick={() => handleNavigateFolder(folder)}
                          onDelete={() => setDeleteFolder(folder)}
                          onRename={() => {
                            setRenameFolder(folder);
                            setNewName(folder.name);
                          }}
                          onDropFiles={(droppedFiles) => handleDropOnFolder(folder, droppedFiles)}
                          onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Files */}
          {(files.length > 0 || folders.length === 0) && (
            <div className="space-y-2">
              {folders.length > 0 && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Files
                </h3>
              )}
              {viewMode === 'grid' ? (
                <FileGrid
                  files={files}
                  selectedFiles={selectedFiles}
                  onSelect={toggleFileSelection}
                  onDownload={handleDownload}
                  onDelete={(f) => setDeleteFile(f)}
                  onRename={(f) => {
                    setRenameFile(f);
                    setNewName(f.original_filename);
                  }}
                  onMove={(f) => setMoveFile(f)}
                  onContextMenu={handleFileContextMenu}
                  onOpenPreview={openPreview}
                />
              ) : (
                <FileTable
                  files={files}
                  selectedFiles={selectedFiles}
                  onSelect={toggleFileSelection}
                  onSelectAll={toggleSelectAllFiles}
                  onDownload={handleDownload}
                  onDelete={(f) => setDeleteFile(f)}
                  onRename={(f) => {
                    setRenameFile(f);
                    setNewName(f.original_filename);
                  }}
                  onMove={(f) => setMoveFile(f)}
                  onContextMenu={handleFileContextMenu}
                  onOpenPreview={openPreview}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onSubmit={handleCreateFolder}
        loading={createFolderMutation.isPending}
      />

      {/* Preview Modal */}
      <FilePreview
        file={previewFile}
        open={!!previewFile}
        onClose={closePreview}
        onDownload={() => previewFile && handleDownload(previewFile)}
        previewUrl={previewUrl}
        previewText={previewText}
        loading={previewLoading}
        error={previewError}
      />

      {/* Rename File Modal */}
      <Modal
        open={!!renameFile}
        onClose={() => { setRenameFile(null); setNewName(''); }}
        title="Rename File"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRenameFile();
          }}
          className="space-y-4"
        >
          <Input
            label="New filename"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => { setRenameFile(null); setNewName(''); }}>
              Cancel
            </Button>
            <Button type="submit" loading={renameFileMutation.isPending}>
              Rename
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        open={!!renameFolder}
        onClose={() => { setRenameFolder(null); setNewName(''); }}
        title="Rename Folder"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRenameFolder();
          }}
          className="space-y-4"
        >
          <Input
            label="New folder name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => { setRenameFolder(null); setNewName(''); }}>
              Cancel
            </Button>
            <Button type="submit" loading={updateFolderMutation.isPending}>
              Rename
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete File Confirmation */}
      <Modal
        open={!!deleteFile}
        onClose={() => setDeleteFile(null)}
        title="Delete File"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-900">{deleteFile?.original_filename}</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteFile(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteFile} loading={deleteFileMutation.isPending}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Delete Folder Confirmation */}
      <Modal
        open={!!deleteFolder}
        onClose={() => setDeleteFolder(null)}
        title="Delete Folder"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete the folder{' '}
          <span className="font-medium text-gray-900">{deleteFolder?.name}</span>?
          All contents will be removed.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteFolder(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteFolder} loading={deleteFolderMutation.isPending}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Move File Modal */}
      <MoveFileModal
        open={!!moveFile}
        onClose={() => setMoveFile(null)}
        onMove={handleMoveFile}
        loading={moveFileMutation.isPending}
        title={`Move "${moveFile?.original_filename ?? ''}"`}
      />

      {/* Bulk Move Modal */}
      <MoveFileModal
        open={showBulkMove}
        onClose={() => setShowBulkMove(false)}
        onMove={handleBulkMove}
        loading={bulkMoveMutation.isPending}
        title={`Move ${selectedFiles.size} file${selectedFiles.size !== 1 ? 's' : ''}`}
      />

      {/* Bulk Delete Confirmation */}
      <Modal
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        title="Delete Files"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-900">{selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}</span>?
          They will be moved to trash.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowBulkDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleBulkDelete} loading={bulkDeleteMutation.isPending}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* File Context Menu */}
      {contextMenu?.type === 'file' && contextMenu.file && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onPreview={() => openPreview(contextMenu.file!)}
          onDownload={() => handleDownload(contextMenu.file!)}
          onRename={() => {
            setRenameFile(contextMenu.file!);
            setNewName(contextMenu.file!.original_filename);
          }}
          onDelete={() => setDeleteFile(contextMenu.file!)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Folder Context Menu */}
      {contextMenu?.type === 'folder' && contextMenu.folder && (
        <FolderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onRename={() => {
            setRenameFolder(contextMenu.folder!);
            setNewName(contextMenu.folder!.name);
          }}
          onDelete={() => setDeleteFolder(contextMenu.folder!)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
