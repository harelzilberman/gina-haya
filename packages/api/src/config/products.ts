export type ProductId =
  | 'analysis_pack_3'
  | 'analysis_pack_6'
  | 'analysis_pack_12'
  | 'tracker_pack_3'
  | 'tracker_pack_6'
  | 'tracker_pack_12';

export type ProductType = 'analysis' | 'tracker';

export interface Product {
  id: ProductId;
  name: string;
  price: number;
  quantity: number;
  type: ProductType;
}

export const PRODUCTS: Record<ProductId, Product> = {
  analysis_pack_3:  { id: 'analysis_pack_3',  name: 'חבילת 3 ניתוחים',  price: 12, quantity: 3,  type: 'analysis' },
  analysis_pack_6:  { id: 'analysis_pack_6',  name: 'חבילת 6 ניתוחים',  price: 18, quantity: 6,  type: 'analysis' },
  analysis_pack_12: { id: 'analysis_pack_12', name: 'חבילת 12 ניתוחים', price: 27, quantity: 12, type: 'analysis' },
  tracker_pack_3:   { id: 'tracker_pack_3',   name: 'חבילת 3 מעקבים',   price: 12, quantity: 3,  type: 'tracker'  },
  tracker_pack_6:   { id: 'tracker_pack_6',   name: 'חבילת 6 מעקבים',   price: 18, quantity: 6,  type: 'tracker'  },
  tracker_pack_12:  { id: 'tracker_pack_12',  name: 'חבילת 12 מעקבים',  price: 27, quantity: 12, type: 'tracker'  },
};
