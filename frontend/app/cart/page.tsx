'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { apiRequest, ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Trash2, ShoppingBag, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, removeItem, setPhoneNumber, clearCart, getTotal, getItemCount } = useCartStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const itemsNeedingPhone = items.filter((item) => !item.phoneNumber || item.phoneNumber.length < 10);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setSuccess(false);

      // Validate phone numbers
      for (const item of items) {
        const phone = (item.phoneNumber || '').trim();
        if (!phone || phone.length < 10) {
          throw new ApiError(`Please enter a valid phone number for "${item.product.name}"`, 400);
        }
      }

      // Each cart item = one order (one receipt number)
      const orders = items.map((item) => ({
        productId: item.productId,
        phoneNumber: item.phoneNumber!.trim(),
      }));

      return apiRequest('/orders/batch', {
        method: 'POST',
        body: JSON.stringify({ orders }),
      });
    },
    onSuccess: () => {
      setSuccess(true);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      setTimeout(() => {
        router.push('/orders');
      }, 2000);
    },
    onError: (err: any) => {
      setError(err?.message || 'Checkout failed. Please check your wallet balance and try again.');
    },
  });

  if (items.length === 0 && !success) {
    return (
      <AuthGuard>
        <DashboardShell title="Shopping Cart" description="Your shopping cart is empty">
          <GlassCard className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <ShoppingBag className="h-16 w-16 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Cart is Empty</h3>
            <p className="text-gray-400 mb-6">Start shopping to add items to your cart</p>
            <Link href="/buy-data">
              <Button>Continue Shopping</Button>
            </Link>
          </GlassCard>
        </DashboardShell>
      </AuthGuard>
    );
  }

  if (success) {
    return (
      <AuthGuard>
        <DashboardShell title="Order Placed!" description="Your orders are being processed">
          <GlassCard className="p-12 text-center max-w-lg mx-auto">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <CheckCircle className="h-12 w-12 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Checkout Successful!</h3>
            <p className="text-gray-400 mb-2">Your orders have been placed and are pending processing.</p>
            <p className="text-sm text-gray-500 mb-6">Redirecting to orders page...</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => router.push('/orders')}>View Orders</Button>
              <Link href="/buy-data">
                <Button variant="secondary">Continue Shopping</Button>
              </Link>
            </div>
          </GlassCard>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardShell title="Shopping Cart" description={`${getItemCount()} item${getItemCount() !== 1 ? 's' : ''} in cart`}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <GlassCard key={item.cartItemId} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">{item.product.name}</h3>
                      <Badge value={item.product.network.code} />
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{item.product.description}</p>

                    {/* Phone number input – each item gets its own */}
                    <div className="mb-3">
                      <label className="mb-1 block text-xs text-gray-500">Recipient Phone Number *</label>
                      <Input
                        placeholder="053 530 8873"
                        value={item.phoneNumber || ''}
                        onChange={(e) => setPhoneNumber(item.cartItemId, e.target.value)}
                        className="max-w-xs"
                      />
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-lg font-semibold text-white">
                        GHS {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    className="shrink-0 text-gray-400 hover:text-red-400 transition p-2"
                    title="Remove item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>

              <div className="space-y-3 mb-6 pb-6 border-b border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Items</span>
                  <span className="text-white font-medium">{getItemCount()} order{getItemCount() !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white">GHS {formatCurrency(getTotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery</span>
                  <span className="text-white">Free</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 rounded-xl bg-violet-600/10 border border-violet-500/20 px-4 py-3">
                <span className="text-sm font-semibold text-white">To pay</span>
                <span className="text-xl font-bold text-violet-400">
                  GHS {formatCurrency(getTotal())}
                </span>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <p className="text-xs text-rose-300">{error}</p>
                </div>
              )}

              {/* Missing phone numbers warning */}
              {itemsNeedingPhone.length > 0 && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-xs text-amber-300">
                    Enter a phone number for each item above.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending || items.length === 0}
                  className="w-full"
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Buy Now — GHS {formatCurrency(getTotal())}
                    </>
                  )}
                </Button>

                <Link href="/buy-data" className="block">
                  <Button variant="secondary" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Continue Shopping
                  </Button>
                </Link>

                <button
                  onClick={() => clearCart()}
                  className="w-full text-sm text-gray-400 hover:text-gray-300 transition py-2"
                >
                  Clear Cart
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
