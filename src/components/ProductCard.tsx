import React from 'react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onAddToCart(product)}
    >
      <div className="aspect-square rounded-xl bg-slate-50 mb-4 overflow-hidden relative">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <span className="text-4xl font-bold">{product.name[0]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">
          <div className="bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
            <Plus size={20} className="text-indigo-600" />
          </div>
        </div>
      </div>
      <h3 className="font-semibold text-slate-800 truncate">{product.name}</h3>
      <div className="flex items-center justify-between mt-2">
        <span className="text-indigo-600 font-bold">{formatCurrency(product.price)}</span>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium",
          product.stock > 10 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
        )}>
          {product.stock} in stock
        </span>
      </div>
    </motion.div>
  );
};

import { cn } from '../lib/utils';
export default ProductCard;
