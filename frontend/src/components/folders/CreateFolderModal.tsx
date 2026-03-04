import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CreateFolderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  loading?: boolean;
}

export function CreateFolderModal({ open, onClose, onSubmit, loading }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }
    onSubmit(name.trim());
    setName('');
    setError('');
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create Folder" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Folder name"
          placeholder="Enter folder name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          error={error}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
