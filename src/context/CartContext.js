// src/context/CartContext.js - Full cart management
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import uuid from 'react-native-uuid';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const cartIdRef = useRef(uuid.v4());

  const addItem = useCallback((product, variant = null, quantity = 1) => {
    setItems(prev => {
      const productId = product.id;
      const variantId = variant?.id || null;
      const existingIndex = prev.findIndex(
        i => i.product_id === productId && i.variant_id === variantId
      );

      const unitPrice = variant
        ? parseFloat(variant.selling_price || variant.effective_selling_price || product.base_selling_price || 0)
        : parseFloat(product.base_selling_price || 0);

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          total_price: (updated[existingIndex].quantity + quantity) * unitPrice,
        };
        return updated;
      }

      return [...prev, {
        id: uuid.v4(),
        product_id: productId,
        variant_id: variantId,
        product_name: product.name,
        variant_name: variant?.name || null,
        unit_price: unitPrice,
        quantity: quantity,
        total_price: unitPrice * quantity,
        discount_amount: 0,
        tax_amount: 0,
        tax_inclusive: product.tax_inclusive !== false,
        product,
        variant,
      }];
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== itemId));
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          quantity: newQuantity,
          total_price: i.unit_price * newQuantity,
        };
      }
      return i;
    }));
  }, []);

  const updateItemDiscount = useCallback((itemId, discountAmount) => {
    setItems(prev => prev.map(i => {
      if (i.id === itemId) {
        return { ...i, discount_amount: parseFloat(discountAmount) || 0 };
      }
      return i;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setDiscount(0);
    setNotes('');
    cartIdRef.current = uuid.v4();
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
  const itemsDiscount = items.reduce((sum, i) => sum + (i.discount_amount || 0), 0);
  const totalDiscount = itemsDiscount + discount;
  const total = Math.max(0, subtotal - totalDiscount);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const getCheckoutPayload = useCallback((shopId, payments, offlineId = null) => {
    return {
      shop_id: shopId,
      offline_id: offlineId || cartIdRef.current,
      customer_id: customer?.id || null,
      customer_name: customer?.name || null,
      customer_phone: customer?.phone_number || null,
      items: items.map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_amount: i.discount_amount || 0,
        tax_inclusive: i.tax_inclusive,
      })),
      payments: payments,
      discount_amount: totalDiscount,
      amount_paid: payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      notes: notes,
      status: 'completed',
    };
  }, [items, customer, totalDiscount, notes]);

  return (
    <CartContext.Provider value={{
      items, customer, discount, notes, subtotal, totalDiscount, total, itemCount,
      addItem, removeItem, updateQuantity, updateItemDiscount,
      setCustomer, setDiscount, setNotes, clearCart, getCheckoutPayload,
      cartId: cartIdRef.current,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
