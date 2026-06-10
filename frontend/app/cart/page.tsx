'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function CartPage() {
  const queryClient = useQueryClient();
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCartStore();

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const orders = items.map((item) => ({
        productId: item.productId,
        phoneNumber: '', // Will be set per item
        quantity: item.quantity,
      }));

      return apiRequest('/orders/batch', {
        method: 'POST',
        body: JSON.stringify({ orders }),
      });
    },
    onSuccess: () => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  if (items.length === 0) {
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

  return (
    <AuthGuard>
      <DashboardShell title="Shopping Cart" description={`${getItemCount()} items in cart`}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <GlassCard key={item.productId} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{item.product.name}</h3>
                      <Badge value={item.product.network.code} />
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{item.product.description}</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Unit Price</p>
                        <p className="text-lg font-semibold text-white">
                          GHS {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Subtotal</p>
                        <p className="text-lg font-semibold text-violet-400">
                          GHS {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end gap-4">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-gray-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1 hover:bg-gray-800 rounded transition"
                      >
                        <Minus className="h-4 w-4 text-gray-400" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateQuantity(item.productId, Math.max(1, val));
                        }}
                        className="w-12 text-center bg-transparent text-white outline-none"
                      />
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-1 hover:bg-gray-800 rounded transition"
                      >
                        <Plus className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
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
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">GHS {formatCurrency(getTotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery</span>
                  <span className="text-white">Free</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tax</span>
                  <span className="text-white">GHS 0.00</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-semibold text-white">Total</span>
                <span className="text-2xl font-bold text-violet-400">
                  GHS {formatCurrency(getTotal())}
                </span>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending || items.length === 0}
                  className="w-full"
                >
                  {checkoutMutation.isPending ? 'Processing...' : 'Proceed to Checkout'}
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
