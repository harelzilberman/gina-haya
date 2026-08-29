export type ProductId =
  | 'analysis_single'
  | 'analysis_pack_5'
  | 'analysis_pack_10'
  | 'tracker_single'
  | 'tracker_pack_5'
  | 'tracker_pack_10';

export type ProductType = 'analysis' | 'tracker';

export interface Product {
  id: ProductId;
  name: string;
  price: number;
  quantity: number;
  type: ProductType;
}

export const PRODUCTS: Record<ProductId, Product> = {
  analysis_single:  { id: 'analysis_single',  name: 'ניתוח צמח בודד',    price: 3.6,  quantity: 1,  type: 'analysis' },
  analysis_pack_5:  { id: 'analysis_pack_5',  name: 'חבילת 5 ניתוחים',   price: 12,   quantity: 5,  type: 'analysis' },
  analysis_pack_10: { id: 'analysis_pack_10', name: 'חבילת 10 ניתוחים',  price: 21,   quantity: 10, type: 'analysis' },
  tracker_single:   { id: 'tracker_single',   name: 'מעקב גידול בודד',   price: 3.6,  quantity: 1,  type: 'tracker'  },
  tracker_pack_5:   { id: 'tracker_pack_5',   name: 'חבילת 5 מעקבים',    price: 12,   quantity: 5,  type: 'tracker'  },
  tracker_pack_10:  { id: 'tracker_pack_10',  name: 'חבילת 10 מעקבים',   price: 21,   quantity: 10, type: 'tracker'  },
};
