import React from 'react';
import { CartItem } from '../types';
import { formatCurrency } from '../lib/utils';
import { Trash2, Plus, Minus, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({ items, onUpdateQuantity, onRemove, onCheckout }) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 w-full max-w-md">
      <div className="p-6 border-bottom border-slate-100 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShoppingCart size={24} className="text-indigo-600" />
          Current Order
        </h2>
        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
          {items.length} items
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <ShoppingCart size={32} />
              </div>
              <p>Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl group"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-slate-300">{item.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                  <p className="text-indigo-600 font-bold text-sm">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                  <button 
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button 
                  onClick={() => onRemove(item.id)}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-slate-500 text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-sm">
            <span>Tax (8%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-slate-800 font-bold text-lg pt-2 border-t border-slate-200">
            <span>Total</span>
            <span className="text-indigo-600">{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          disabled={items.length === 0}
          onClick={onCheckout}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
        >
          <Receipt size={20} />
          Complete Checkout
        </button>
      </div>
    </div>
  );
};

import { ShoppingCart } from 'lucide-react';
export default Cart;
