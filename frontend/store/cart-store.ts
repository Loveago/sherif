import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/lib/types';

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  addedAt: string;
  phoneNumber?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number, price: number, phoneNumber?: string) => void;
  removeItem: (productId: string, phoneNumber?: string) => void;
  updateQuantity: (productId: string, quantity: number, phoneNumber?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity, price, phoneNumber) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === product.id && item.phoneNumber === phoneNumber
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id && item.phoneNumber === phoneNumber
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                product,
                quantity,
                price,
                addedAt: new Date().toISOString(),
                phoneNumber,
              },
            ],
          };
        });
      },

      removeItem: (productId, phoneNumber) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.phoneNumber === phoneNumber)
          ),
        }));
      },

      updateQuantity: (productId, quantity, phoneNumber) => {
        if (quantity <= 0) {
          get().removeItem(productId, phoneNumber);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.phoneNumber === phoneNumber
              ? { ...item, quantity }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getItemCount: () => {
        const state = get();
        return state.items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-store',
      version: 1,
    }
  )
);
