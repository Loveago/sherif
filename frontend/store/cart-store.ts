import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/lib/types';

let nextCartItemId = 1;

export interface CartItem {
  cartItemId: number;
  productId: string;
  product: Product;
  price: number;
  addedAt: string;
  phoneNumber?: string;
}

export interface CartStore {
  items: CartItem[];
  addItem: (product: Product, price: number) => number;
  removeItem: (cartItemId: number) => void;
  setPhoneNumber: (cartItemId: number, phoneNumber: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      /**
       * Adds ONE item to the cart. Each call creates a separate line item
       * so the user can enter a unique phone number per recipient.
       * Returns the new cartItemId.
       */
      addItem: (product, price) => {
        const cartItemId = nextCartItemId++;
        set((state) => ({
          items: [
            ...state.items,
            {
              cartItemId,
              productId: product.id,
              product,
              price,
              addedAt: new Date().toISOString(),
            },
          ],
        }));
        return cartItemId;
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        }));
      },

      setPhoneNumber: (cartItemId, phoneNumber) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, phoneNumber } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + Number(item.price ?? 0), 0);
      },

      getItemCount: () => {
        return get().items.length;
      },
    }),
    {
      name: 'cart-store',
      version: 2,
      migrate: (persistedState: any, _version: number) => {
        // Migration from v1 (old format with quantity/merge) to v2 (line items)
        if (persistedState?.items?.length > 0 && persistedState.items[0].quantity !== undefined) {
          const newItems = [];
          let maxId = 0;
          for (const old of persistedState.items) {
            for (let i = 0; i < old.quantity; i++) {
              const cartItemId = nextCartItemId++;
              if (cartItemId > maxId) maxId = cartItemId;
              newItems.push({
                cartItemId,
                productId: old.productId,
                product: old.product,
                price: old.price,
                addedAt: old.addedAt,
                phoneNumber: old.phoneNumber,
              });
            }
          }
          nextCartItemId = maxId + 1;
          return { items: newItems };
        }
        return persistedState;
      },
    }
  )
);
