
export type Size = {
  name: string;
  quantity: number;
};


export type Product = ApiProduct & {
  key: string;
};

export type StockFilter = "all" | "in" | "low" | "out";

export interface Category {
  id: number;
  name: string;
  level: number;
  parentCategory: Category | null;
}


export type ApiProduct = {
  id?: string | number;
  _id?: string | number;
  imageUrl: string;
  brand: string;
  color: string;
  title: string;
  discountedPrice: number;
  price: number;
  discountPercent: number;
  sizes: Size[];
  quantity: number;
  category: Category;
  description: string;
  topLevelCategory?: string;
  secondLevelCategory?: string;
  thirdLevelCategory?: string;
};
