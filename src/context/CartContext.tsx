import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MealItem, SubscriptionFrequency } from '../types';
import { TiffinService } from '../services/tiffinService';

export type AppRoute =
  | { name: 'home' }
  | { name: 'meal-details'; mealId: string }
  | { name: 'provider-details'; providerId: string }
  | { name: 'checkout' }
  | { name: 'order-confirmation'; orderId: string }
  | { name: 'provider-dashboard' };

interface CartContextType {
  cart: CartItem[];
  addToCart: (meal: MealItem, frequency: SubscriptionFrequency, slot: 'lunch' | 'dinner', qty?: number, instructions?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  totalCartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'tiffintrack_user_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [currentRoute, setCurrentRoute] = useState<AppRoute>({ name: 'home' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  const addToCart = (
    meal: MealItem,
    frequency: SubscriptionFrequency,
    slot: 'lunch' | 'dinner',
    qty: number = 1,
    instructions?: string
  ) => {
    const existingIndex = cart.findIndex(
      item => item.meal.id === meal.id && item.frequency === frequency && item.selectedSlot === slot
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      const existing = updated[existingIndex];
      const newQty = existing.quantity + qty;
      const unitTotalPrice = TiffinService.calculateItemPrice(meal, frequency, newQty);
      updated[existingIndex] = {
        ...existing,
        quantity: newQty,
        totalPrice: unitTotalPrice,
        specialInstructions: instructions || existing.specialInstructions,
      };
      setCart(updated);
      showToast(`Updated ${meal.title} quantity to ${newQty}`);
    } else {
      const itemPrice = TiffinService.calculateItemPrice(meal, frequency, qty);
      const newItem: CartItem = {
        cartItemId: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        meal,
        frequency,
        quantity: qty,
        selectedSlot: slot,
        specialInstructions: instructions,
        totalPrice: itemPrice,
      };
      setCart(prev => [...prev, newItem]);
      showToast(`Added ${meal.title} to your dabba order`);
    }
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
    showToast('Item removed from cart');
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const newTotal = TiffinService.calculateItemPrice(item.meal, item.frequency, newQty);
          return { ...item, quantity: newQty, totalPrice: newTotal };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const navigate = (route: AppRoute) => {
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        currentRoute,
        navigate,
        toastMessage,
        showToast,
        totalCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
