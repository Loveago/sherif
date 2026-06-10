'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import { useCartStore } from '@/store/cart-store';
import type { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Check, ChevronRight, ShoppingCart } from 'lucide-react';

const networks = [
  { code: 'MTN', name: 'MTN', color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/50' },
  { code: 'Telecel', name: 'Telecel', color: 'bg-rose-500', textColor: 'text-rose-400', borderColor: 'border-rose-500/50' },
  { code: 'AirtelTigo', name: 'AirtelTigo', color: 'bg-sky-500', textColor: 'text-sky-400', borderColor: 'border-sky-500/50' },
];

export default function BuyDataPage() {
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiRequest<Product[]>('/products'),
  });

  const bundleOptions = useMemo(
    () => products.filter((product) => product.network.code === selectedNetwork),
    [products, selectedNetwork],
  );

  const purchaseMutation = useMutation({
    mutationFn: () =>
      apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({ productId: selectedProduct?.id, phoneNumber }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setStep(1);
      setSelectedProduct(null);
      setPhoneNumber('');
    },
  });

  const handleNetworkSelect = (code: string) => {
    setSelectedNetwork(code);
    setSelectedProduct(null);
    setStep(2);
  };

  const handleBundleSelect = (product: Product) => {
    setSelectedProduct(product);
    setStep(3);
  };

  const handleConfirm = () => {
    if (selectedProduct && phoneNumber) {
      purchaseMutation.mutate();
    }
  };

  return (
    <AuthGuard>
      <DashboardShell title="Buy Data" description="Purchase data bundles from all major networks.">
        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-4">
          {[
            { num: 1, label: 'Select' },
            { num: 2, label: 'Number' },
            { num: 3, label: 'Confirm' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= s.num ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-500'
                }`}
              >
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span className={`text-sm ${step >= s.num ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-gray-600" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Network */}
        {step === 1 && (
          <div className="mx-auto max-w-2xl">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white">Select Network</h3>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {networks.map((network) => (
                  <button
                    key={network.code}
                    onClick={() => handleNetworkSelect(network.code)}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all ${
                      selectedNetwork === network.code
                        ? `${network.borderColor} bg-gray-800/50`
                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                    }`}
                  >
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${network.color}`}>
                      <span className="text-lg font-bold text-white">{network.name.slice(0, 2)}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{network.name}</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Step 2: Select Bundle */}
        {step === 2 && (
          <div className="mx-auto max-w-2xl">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Select Bundle</h3>
                <button onClick={() => setStep(1)} className="text-sm text-violet-400 hover:text-violet-300">
                  Change Network
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {bundleOptions.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleBundleSelect(product)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all ${
                      selectedProduct?.id === product.id
                        ? 'border-violet-500 bg-violet-600/10'
                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">{product.dataSize}</span>
                      <span className="text-xs text-gray-500">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{formatCurrency(product.sellingPrice)}</span>
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    </div>
                  </button>
                ))}
                {bundleOptions.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">No bundles available for this network</p>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedProduct && (
          <div className="mx-auto max-w-md">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white">Confirm Purchase</h3>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Bundle</span>
                    <span className="text-sm font-medium text-white">{selectedProduct.dataSize} - {selectedProduct.name}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-400">Price</span>
                    <span className="text-sm font-medium text-white">{formatCurrency(selectedProduct.sellingPrice)}</span>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-gray-400">Phone Number</label>
                  <Input
                    placeholder="055 123 4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={handleConfirm}
                    disabled={!phoneNumber || purchaseMutation.isPending}
                  >
                    {purchaseMutation.isPending ? 'Processing...' : 'Buy Now'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      if (selectedProduct) {
                        addItem(selectedProduct, 1, selectedProduct.sellingPrice);
                        setAddedToCart(true);
                        setTimeout(() => setAddedToCart(false), 2000);
                      }
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
                    Back
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}
