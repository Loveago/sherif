'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { useCartStore } from '@/store/cart-store';
import type { OrderBatch, Network, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Upload, FileText, CheckCircle2, XCircle, ClipboardList, Send, ShoppingCart, ArrowRight } from 'lucide-react';

type PreviewRecord = {
  phoneNumber: string;
  productName: string;
  valid: boolean;
  amount: number | null;
  productId?: string;
};

type UploadResponse = { records: PreviewRecord[]; totalAmount: number; totalRecords: number };

type PastePreviewRecord = {
  phoneNumber: string;
  dataSize: string;
  valid: boolean;
  amount: number | null;
  productId: string | null;
  productName: string | null;
};

type PastePreviewResponse = {
  records: PastePreviewRecord[];
  totalAmount: number;
  totalRecords: number;
  validCount: number;
};

export default function BulkOrdersPage() {
  const queryClient = useQueryClient();
  const { addItem, setPhoneNumber } = useCartStore();
  const [preview, setPreview] = useState<UploadResponse | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [rawText, setRawText] = useState('');
  const [pastePreview, setPastePreview] = useState<PastePreviewResponse | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const { data: batches = [] } = useQuery({ queryKey: ['batches'], queryFn: () => apiRequest<OrderBatch[]>('/bulk-orders') });
  const { data: networks = [] } = useQuery({ queryKey: ['networks'], queryFn: () => apiRequest<Network[]>('/networks') });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest<UploadResponse>('/bulk-orders/upload', { method: 'POST', body: formData });
    },
    onSuccess: (data) => setPreview(data),
  });

  const processMutation = useMutation({
    mutationFn: (records: PreviewRecord[]) => apiRequest('/bulk-orders/process', { method: 'POST', body: JSON.stringify({ records }) }),
    onSuccess: () => {
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => {
      setPasteError(null);
      return apiRequest<PastePreviewResponse>('/bulk-orders/paste-preview', {
        method: 'POST',
        body: JSON.stringify({ networkId: selectedNetwork, rawText }),
      });
    },
    onSuccess: (data) => setPastePreview(data),
    onError: (error: any) => {
      setPasteError(error?.message || 'Failed to preview orders');
    },
  });

  const handleAddToCart = () => {
    if (!pastePreview) return;
    const validRecords = pastePreview.records.filter((r) => r.valid && r.productId && r.amount !== null);
    validRecords.forEach((r) => {
      // Construct a minimal product object for the cart
      const product: Product = {
        id: r.productId!,
        name: r.productName || `${r.dataSize} Bundle`,
        description: `${r.dataSize} data bundle`,
        dataSize: r.dataSize,
        sellingPrice: r.amount!,
        agentPrice: r.amount!,
        resellerPrice: r.amount!,
        buyingPrice: r.amount!,
        status: true,
        networkId: selectedNetwork,
        network: networks.find((n) => n.id === selectedNetwork) || { id: selectedNetwork, name: 'Unknown', code: 'UNK', color: '#666' },
      };
      const cartItemId = addItem(product, r.amount!);
      // Set the phone number directly so the user doesn't need to re-enter it
      setPhoneNumber(cartItemId, r.phoneNumber);
    });
    setShowPasteModal(false);
    setPastePreview(null);
    setRawText('');
    setSelectedNetwork('');
  };

  return (
    <AuthGuard>
      <DashboardShell title="Bulk Orders" description="Upload CSV or paste orders to queue batch data purchases.">
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Upload Batch */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Upload Batch File</h3>
                <p className="text-sm text-gray-400">CSV & XLSX Supported</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-400">Required fields: Phone Number and Product. The system validates products, calculates cost and pushes valid records to the queue.</p>
            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50 p-8 text-center transition-colors hover:border-violet-500/50">
              <Upload className="h-8 w-8 text-gray-500" />
              <p className="mt-3 text-sm text-gray-400">
                {uploadMutation.isPending ? 'Uploading and validating...' : 'Click to select CSV or XLSX file'}
              </p>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }} />
            </label>
            {preview ? (
              <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-600/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Total Records</span>
                  <span className="text-sm font-medium text-white">{preview.totalRecords}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-300">Calculated Cost</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(preview.totalAmount)}</span>
                </div>
                <Button className="mt-4 w-full" onClick={() => processMutation.mutate(preview.records)} disabled={processMutation.isPending}>
                  {processMutation.isPending ? 'Processing Batch...' : 'Process Batch'}
                </Button>
              </div>
            ) : null}
          </GlassCard>

          {/* Paste Orders Card */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Paste Orders</h3>
                <p className="text-sm text-gray-400">Quick text entry</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Paste phone numbers and bundle sizes. Each line: <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-white">number gb</code> e.g. <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-white">0244123456 1</code>
            </p>
            <Button className="mt-6 w-full" onClick={() => setShowPasteModal(true)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Open Paste Orders
            </Button>
          </GlassCard>
        </div>

        {/* Preview Records */}
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <GlassCard className="p-5">
            <h3 className="text-base font-semibold text-white">Upload Preview</h3>
            <div className="mt-4 space-y-2">
              {(preview?.records ?? []).map((record, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{record.phoneNumber}</p>
                    <p className="text-xs text-gray-500">{record.productName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    )}
                    <span className="text-sm text-white">{record.amount ? formatCurrency(record.amount) : '—'}</span>
                  </div>
                </div>
              ))}
              {(!preview || preview.records.length === 0) && (
                <p className="py-8 text-center text-sm text-gray-500">Upload a file to preview records</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Batch Dashboard */}
        <div className="mt-5">
          <GlassCard className="p-5">
            <h3 className="text-base font-semibold text-white">Batch Dashboard</h3>
            <div className="mt-4 space-y-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{batch.fileName}</p>
                      <p className="text-xs text-gray-500">{batch.totalRecords} records</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatCurrency(batch.totalAmount)}</p>
                      <Badge value={batch.status} />
                    </div>
                  </div>
                </div>
              ))}
              {batches.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">No batches yet</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Paste Orders Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-[#111827] shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-semibold text-white">Paste Orders</h3>
                </div>
                <button
                  onClick={() => { setShowPasteModal(false); setPastePreview(null); setPasteError(null); }}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                {/* Network Select */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Select Network</label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => { setSelectedNetwork(e.target.value); setPastePreview(null); }}
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                  >
                    <option value="">-- Select a Network --</option>
                    {networks.map((network) => (
                      <option key={network.id} value={network.id}>{network.name}</option>
                    ))}
                  </select>
                </div>

                {/* Raw Text */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Phone Numbers & Bundle Amounts
                  </label>
                  <p className="mb-1.5 text-[10px] text-gray-500">
                    Paste one order per line: <span className="text-gray-300">number gb</span> (e.g. 0244123456 1)
                  </p>
                  <textarea
                    value={rawText}
                    onChange={(e) => { setRawText(e.target.value); setPastePreview(null); }}
                    placeholder={`0244123456 1\n0551234567 2\n0201234567 5`}
                    rows={6}
                    className="w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500"
                  />
                </div>

                {pasteError && (
                  <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400 border border-rose-500/20">
                    {pasteError}
                  </p>
                )}

                {/* Preview */}
                {pastePreview && (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-600/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {pastePreview.validCount} of {pastePreview.totalRecords} valid
                      </span>
                      <span className="text-sm font-semibold text-white">
                        Total: GHS {formatCurrency(pastePreview.totalAmount)}
                      </span>
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {pastePreview.records.map((record, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-gray-900/60 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            {record.valid ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-rose-400" />
                            )}
                            <span className="text-xs text-white">{record.phoneNumber}</span>
                            <span className="text-[10px] text-gray-500">{record.dataSize}</span>
                          </div>
                          <span className="text-xs text-white">
                            {record.amount ? `GHS ${formatCurrency(record.amount)}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => { setShowPasteModal(false); setPastePreview(null); }}
                  >
                    Cancel
                  </Button>
                  {!pastePreview ? (
                    <Button
                      className="flex-1"
                      disabled={!selectedNetwork || !rawText.trim() || previewMutation.isPending}
                      onClick={() => previewMutation.mutate()}
                    >
                      {previewMutation.isPending ? 'Previewing...' : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Preview
                        </>
                      )}
                    </Button>
                  ) : (
                    <Link href="/cart" className="flex-1">
                      <Button
                        className="w-full"
                        disabled={pastePreview.validCount === 0}
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add {pastePreview.validCount} to Cart
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}
