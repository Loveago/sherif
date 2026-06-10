'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import type { OrderBatch } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Upload, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

type PreviewRecord = {
  phoneNumber: string;
  productName: string;
  valid: boolean;
  amount: number | null;
  productId?: string;
};

type UploadResponse = { records: PreviewRecord[]; totalAmount: number; totalRecords: number };

export default function BulkOrdersPage() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<UploadResponse | null>(null);
  const { data: batches = [] } = useQuery({ queryKey: ['batches'], queryFn: () => apiRequest<OrderBatch[]>('/bulk-orders') });

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

  return (
    <AuthGuard>
      <DashboardShell title="Bulk Orders" description="Upload CSV or XLSX files, preview records, calculate cost, and process queued batch orders.">
        <div className="grid gap-5 xl:grid-cols-2">
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

          <GlassCard className="p-5">
            <h3 className="text-base font-semibold text-white">Preview Records</h3>
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
      </DashboardShell>
    </AuthGuard>
  );
}
