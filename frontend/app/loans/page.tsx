'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';

interface Loan {
  id: string;
  amount: number;
  outstandingBalance: number;
  status: string;
  createdAt: string;
  dueDate: string;
  notes: string;
}

export default function LoansPage() {
  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => apiRequest<Loan[]>('/loans'),
  });

  const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const activeLoanCount = loans.filter((loan) => loan.status === 'ACTIVE').length;

  return (
    <AuthGuard>
      <DashboardShell title="Loan Management" description="View and manage your loans.">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Loans</p>
                <p className="mt-2 text-3xl font-bold text-white">GHS {formatCurrency(totalLoanAmount)}</p>
              </div>
              <DollarSign className="h-12 w-12 text-violet-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Outstanding Balance</p>
                <p className="mt-2 text-3xl font-bold text-white">GHS {formatCurrency(totalOutstanding)}</p>
              </div>
              <TrendingDown className="h-12 w-12 text-rose-600/30" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Loans</p>
                <p className="mt-2 text-3xl font-bold text-white">{activeLoanCount}</p>
              </div>
              <Clock className="h-12 w-12 text-amber-600/30" />
            </div>
          </GlassCard>
        </div>

        {/* Loans List */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Loans</h3>

          {loans.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 mb-4">You don't have any loans yet.</p>
              <p className="text-sm text-gray-600">Contact support if you'd like to apply for a loan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-col gap-4 rounded-lg border border-gray-700/50 bg-gray-900/30 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-lg font-semibold text-white">Loan #{loan.id.slice(0, 8)}</h4>
                        <Badge
                          variant={loan.status === 'ACTIVE' ? 'success' : 'warning'}
                        >
                          {loan.status}
                        </Badge>
                      </div>

                      {loan.notes && (
                        <p className="text-sm text-gray-400 mb-3">{loan.notes}</p>
                      )}

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Loan Amount</p>
                          <p className="text-2xl font-bold text-white">GHS {formatCurrency(loan.amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Outstanding Balance</p>
                          <p className="text-2xl font-bold text-rose-400">GHS {formatCurrency(loan.outstandingBalance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Paid Amount</p>
                          <p className="text-2xl font-bold text-emerald-400">
                            GHS {formatCurrency(loan.amount - loan.outstandingBalance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="border-t border-gray-700/50 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Repayment Progress</span>
                      <span className="text-xs font-medium text-white">
                        {loan.amount > 0 ? ((loan.amount - loan.outstandingBalance) / loan.amount * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300"
                        style={{
                          width: `${loan.amount > 0 ? ((loan.amount - loan.outstandingBalance) / loan.amount * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="border-t border-gray-700/50 pt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Created: {new Date(loan.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Due: {new Date(loan.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Info Box */}
        <GlassCard className="p-6 mt-6 bg-blue-600/10 border-blue-600/20">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">About Loans</h3>
          <p className="text-sm text-gray-400">
            Loans are assigned by the admin and can be used to deduct from your orders. The outstanding balance will be automatically deducted from your order payments until fully repaid.
          </p>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}
