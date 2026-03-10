import { create } from 'zustand';

const useProductStore = create((set, get) => ({
  currentCustomerId: null,
  cartItems: {}, // Object: {customerId: [...items]}
  
  // Set current customer
  setCurrentCustomer: (customerId) => set({ currentCustomerId: customerId }),
  
  // Get current customer's cart
  getCurrentCart: () => {
    const { currentCustomerId, cartItems } = get();
    return cartItems[currentCustomerId] || [];
  },
  
  // Backward compatibility - returns current customer's products
  get products() {
    return get().getCurrentCart();
  },
  
  addProduct: (product) => set((state) => {
    const { currentCustomerId } = state;
    if (!currentCustomerId) return state;
    
    const currentCart = state.cartItems[currentCustomerId] || [];
    const exists = currentCart.some((p) => p.id === product.id);
    
    if (!exists) {
      return {
        ...state,
        cartItems: {
          ...state.cartItems,
          [currentCustomerId]: [...currentCart, product]
        }
      };
    } else {
      const updatedCart = currentCart.map((p) =>
        p.id === product.id ? (() => {
          // determine new qty and unit price
          const newQty = typeof product.quantity !== 'undefined' ? product.quantity : (typeof product.qty !== 'undefined' ? product.qty : (p.quantity ?? p.qty ?? 1));
          const newPriceUnit = typeof product.price_unit !== 'undefined' ? product.price_unit : (typeof product.price !== 'undefined' ? product.price : (p.price_unit ?? p.price ?? 0));
          const newPrice = typeof product.price !== 'undefined' ? product.price : (p.price ?? newPriceUnit);
          const subtotal = Number(newQty) * Number(newPriceUnit);
          return {
            ...p,
            // keep backwards-compatible fields in sync
            quantity: newQty,
            qty: newQty,
            price: newPrice,
            price_unit: newPriceUnit,
            // recalculate subtotal fields so UI uses up-to-date values
            price_subtotal: subtotal,
            price_subtotal_incl: subtotal,
          };
        })() : p
      );
      return {
        ...state,
        cartItems: {
          ...state.cartItems,
          [currentCustomerId]: updatedCart.filter((p) => (p.quantity ?? p.qty ?? 1) > 0)
        }
      };
    }
  }),
  
  removeProduct: (productId) => set((state) => {
    const { currentCustomerId } = state;
    if (!currentCustomerId) return state;
    
    const currentCart = state.cartItems[currentCustomerId] || [];
    return {
      ...state,
      cartItems: {
        ...state.cartItems,
        [currentCustomerId]: currentCart.filter((product) => product.id !== productId)
      }
    };
  }),
  
  clearProducts: () => set((state) => {
    const { currentCustomerId } = state;
    if (!currentCustomerId) return state;
    
    return {
      ...state,
      cartItems: {
        ...state.cartItems,
        [currentCustomerId]: []
      }
    };
  }),
  
  // Load customer cart (from API or localStorage)
  loadCustomerCart: (customerId, cartData) => set((state) => ({
    ...state,
    currentCustomerId: customerId,
    cartItems: {
      ...state.cartItems,
      [customerId]: cartData || []
    }
  })),
  
  // Clear all carts
  clearAllCarts: () => set({ cartItems: {}, currentCustomerId: null }),
}));

export default useProductStore;
