import { create } from 'zustand';
import { CartItem, Product } from '../types';

interface CartState {
  items: CartItem[];
  customerName: string;
  customerWhatsapp: string;
  paymentMethod: 'cash' | 'transfer' | 'qris';
  discount: number;
  notes: string;
  handlerEmployeeId: string;
  handlerEmployeeName: string;

  addItem: (product: Product) => void;
  removeItem: (productLocalId: string) => void;
  updateQuantity: (productLocalId: string, quantity: number) => void;
  setCustomerName: (name: string) => void;
  setCustomerWhatsapp: (whatsapp: string) => void;
  setPaymentMethod: (method: 'cash' | 'transfer' | 'qris') => void;
  setDiscount: (discount: number) => void;
  setNotes: (notes: string) => void;
  setHandlerEmployee: (id: string, name: string) => void;
  clear: () => void;

  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  customerWhatsapp: '',
  paymentMethod: 'cash',
  discount: 0,
  notes: '',
  handlerEmployeeId: '',
  handlerEmployeeName: '',

  addItem: (product) => {
    const existing = get().items.find((i) => i.product.local_id === product.local_id);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.product.local_id === product.local_id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({ items: [...get().items, { product, quantity: 1 }] });
    }
  },

  removeItem: (productLocalId) => {
    set({ items: get().items.filter((i) => i.product.local_id !== productLocalId) });
  },

  updateQuantity: (productLocalId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productLocalId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.product.local_id === productLocalId ? { ...i, quantity } : i
      ),
    });
  },

  setCustomerName: (customerName) => set({ customerName }),
  setCustomerWhatsapp: (customerWhatsapp) => set({ customerWhatsapp }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setDiscount: (discount) => set({ discount }),
  setNotes: (notes) => set({ notes }),
  setHandlerEmployee: (id, name) => set({ handlerEmployeeId: id, handlerEmployeeName: name }),

  clear: () =>
    set({
      items: [],
      customerName: '',
      customerWhatsapp: '',
      paymentMethod: 'cash',
      discount: 0,
      notes: '',
      handlerEmployeeId: '',
      handlerEmployeeName: '',
    }),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  getTotal: () => get().getSubtotal() - get().discount,
  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
