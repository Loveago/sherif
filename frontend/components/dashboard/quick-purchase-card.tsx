'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { Product } from '@/lib/types';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const schema = z.object({
  network: z.string().min(1),
  productId: z.string().min(1),
  phoneNumber: z.string().min(10),
});

type FormValues = z.infer<typeof schema>;

export function QuickPurchaseCard() {
  const queryClient = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiRequest<Product[]>('/products'),
  });

  const { register, watch, handleSubmit, resetField, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      network: '',
      productId: '',
      phoneNumber: '',
    },
  });

  const selectedNetwork = watch('network');
  const networkOptions = useMemo(() => Array.from(new Set(products.map((product) => product.network.code))), [products]);
  const bundleOptions = useMemo(() => products.filter((product) => product.network.code === selectedNetwork), [products, selectedNetwork]);

  useEffect(() => {
    resetField('productId');
  }, [selectedNetwork, resetField]);

  const purchaseMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({ productId: values.productId, phoneNumber: values.phoneNumber }),
      }),
    onSuccess: () => {
      setValue('phoneNumber', '');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Quick Data Purchase</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Buy bundles directly from your dashboard</h3>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit((values) => purchaseMutation.mutate(values))}>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Network</label>
          <Select {...register('network')}>
            <option value="">Select Network</option>
            {networkOptions.map((option) => (
              <option key={option} value={option} className="bg-slate-950">
                {option}
              </option>
            ))}
          </Select>
          {errors.network ? <p className="mt-2 text-xs text-rose-300">{errors.network.message}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Bundle</label>
          <Select {...register('productId')}>
            <option value="">Select Bundle</option>
            {bundleOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-950">
                {option.name} {option.description} — GHS {Number(option.sellingPrice).toFixed(2)}
              </option>
            ))}
          </Select>
          {errors.productId ? <p className="mt-2 text-xs text-rose-300">{errors.productId.message}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Phone Number</label>
          <Input placeholder="055 123 4567" {...register('phoneNumber')} />
          {errors.phoneNumber ? <p className="mt-2 text-xs text-rose-300">{errors.phoneNumber.message}</p> : null}
        </div>

        <Button className="w-full" disabled={purchaseMutation.isPending}>
          {purchaseMutation.isPending ? 'Processing Purchase...' : 'Confirm Purchase'}
        </Button>
      </form>
    </GlassCard>
  );
}
