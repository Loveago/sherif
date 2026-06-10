'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { Copy, Eye, EyeOff, Trash2, Plus, CheckCircle2, Clock } from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  key: string;
  status: string;
  lastUsed: string | null;
  createdAt: string;
  usageCount: number;
}

export default function APIKeysPage() {
  const queryClient = useQueryClient();
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const { data: keys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiRequest<APIKey[]>('/api-keys'),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest('/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyName('');
      setShowNewKeyForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) => apiRequest(`/api-keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const toggleReveal = (keyId: string) => {
    const newSet = new Set(revealedKeys);
    if (newSet.has(keyId)) {
      newSet.delete(keyId);
    } else {
      newSet.add(keyId);
    }
    setRevealedKeys(newSet);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AuthGuard>
      <DashboardShell title="API Keys" description="Manage your API keys for integrations and webhooks.">
        {/* Create New Key */}
        {!showNewKeyForm && (
          <Button onClick={() => setShowNewKeyForm(true)} className="mb-6">
            <Plus className="h-4 w-4 mr-2" />
            Create New API Key
          </Button>
        )}

        {showNewKeyForm && (
          <GlassCard className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create New API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Key Name</label>
                <Input
                  placeholder="e.g., Production API Key, Development Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (newKeyName.trim()) {
                      createMutation.mutate(newKeyName);
                    }
                  }}
                  disabled={!newKeyName.trim() || createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Key'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowNewKeyForm(false);
                    setNewKeyName('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* API Keys List */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your API Keys</h3>

          {keys.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No API keys yet. Create one to get started.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-700/50 bg-gray-900/30 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-white">{key.name}</h4>
                        <Badge
                          variant={key.status === 'ACTIVE' ? 'success' : 'warning'}
                        >
                          {key.status}
                        </Badge>
                      </div>

                      {/* Key Display */}
                      <div className="flex items-center gap-2 mb-3 bg-black/20 rounded-lg p-3">
                        <code className="flex-1 text-sm text-gray-400 font-mono break-all">
                          {revealedKeys.has(key.id) ? key.key : key.key.slice(0, 10) + '...' + key.key.slice(-10)}
                        </code>
                        <button
                          onClick={() => toggleReveal(key.id)}
                          className="p-1 hover:bg-gray-700 rounded transition"
                        >
                          {revealedKeys.has(key.id) ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.key)}
                          className="p-1 hover:bg-gray-700 rounded transition"
                        >
                          <Copy className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-500">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{key.usageCount} requests</span>
                        </div>
                        {key.lastUsed ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>Last used: {new Date(key.lastUsed).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>Never used</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => deleteMutation.mutate(key.id)}
                      disabled={deleteMutation.isPending}
                      className="ml-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Documentation */}
        <GlassCard className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">How to Use Your API Key</h3>
          <div className="space-y-4 text-sm text-gray-400">
            <div>
              <p className="font-medium text-white mb-2">1. Include in Request Header</p>
              <code className="block bg-black/20 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            <div>
              <p className="font-medium text-white mb-2">2. Example Request</p>
              <code className="block bg-black/20 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                curl -H "Authorization: Bearer YOUR_API_KEY" https://api.datahubgh.com/v1/orders
              </code>
            </div>
            <div>
              <p className="font-medium text-white mb-2">3. Rate Limits</p>
              <p>Your API key is limited to 1000 requests per hour.</p>
            </div>
          </div>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}
