import { useState } from 'react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/hooks/useApiKeys';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeDate } from '@/lib/utils';
import {
  KeyIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const AVAILABLE_PERMISSIONS = [
  { value: 'files:read', label: 'Read Files' },
  { value: 'files:write', label: 'Write Files' },
  { value: 'files:delete', label: 'Delete Files' },
  { value: 'folders:read', label: 'Read Folders' },
  { value: 'folders:write', label: 'Write Folders' },
  { value: 'folders:delete', label: 'Delete Folders' },
];

export function ApiKeysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiKeysQuery = useApiKeys();
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();

  const keys = apiKeysQuery.data?.results ?? [];

  const handleCreate = () => {
    createMutation.mutate(
      { name: newKeyName, permissions: selectedPermissions },
      {
        onSuccess: (data) => {
          setCreatedKey(data.key);
          setShowCreate(false);
          setNewKeyName('');
          setSelectedPermissions([]);
        },
      }
    );
  };

  const handleRevoke = () => {
    if (revokeId) {
      revokeMutation.mutate(revokeId, {
        onSuccess: () => setRevokeId(null),
      });
    }
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  if (apiKeysQuery.isLoading) {
    return <Spinner className="py-20" size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">
            Manage API keys for programmatic access
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <PlusIcon className="h-4 w-4" />
          Create Key
        </Button>
      </div>

      {keys.length === 0 ? (
        <EmptyState
          icon={<KeyIcon className="h-16 w-16" />}
          title="No API keys"
          description="Create an API key to access the platform programmatically."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <PlusIcon className="h-4 w-4" />
              Create Key
            </Button>
          }
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/[0.04]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Key Prefix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {key.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono dark:text-slate-400">
                      {key.prefix}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {key.permissions.map((perm) => (
                          <Badge key={perm} variant="info">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatRelativeDate(key.created)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {key.last_used ? formatRelativeDate(key.last_used) : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={key.revoked ? 'danger' : 'success'}>
                        {key.revoked ? 'Revoked' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!key.revoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeId(key.prefix)}
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Key Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setNewKeyName('');
          setSelectedPermissions([]);
        }}
        title="Create API Key"
      >
        <div className="space-y-4">
          <Input
            label="Key name"
            placeholder="e.g., CI/CD Pipeline"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200">
              Permissions
            </label>
            <div className="space-y-2">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.value)}
                    onChange={() => togglePermission(perm.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/20 dark:bg-slate-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreate(false);
                setNewKeyName('');
                setSelectedPermissions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!newKeyName.trim() || selectedPermissions.length === 0}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Show Created Key Modal */}
      <Modal
        open={!!createdKey}
        onClose={() => {
          setCreatedKey(null);
          setCopied(false);
        }}
        title="API Key Created"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 dark:bg-yellow-500/10 dark:border-yellow-400/20">
            <p className="text-sm text-yellow-800 font-medium dark:text-yellow-300">
              Make sure to copy your API key now. You won&apos;t be able to see it again!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-900 break-all dark:bg-slate-800 dark:text-slate-200">
              {createdKey}
            </code>
            <Button variant="secondary" size="sm" onClick={handleCopyKey}>
              <ClipboardDocumentIcon className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setCreatedKey(null);
                setCopied(false);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation */}
      <Modal
        open={!!revokeId}
        onClose={() => setRevokeId(null)}
        title="Revoke API Key"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4 dark:text-slate-400">
          Are you sure you want to revoke this API key? Any applications using this key
          will lose access immediately.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRevokeId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRevoke} loading={revokeMutation.isPending}>
            Revoke
          </Button>
        </div>
      </Modal>
    </div>
  );
}
