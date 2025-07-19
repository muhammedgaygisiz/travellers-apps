export interface MenuItem {
  name: string;
  description: string;
  ingredients?: string;
  notes?: string;
  price: number;
  variants?: MenuItem[];
}

interface ExtraItem {
  name: string;
  price: number;
}

export interface Category {
  title: string;
  subtitle?: string;

  items: MenuItem[];

  extrasBlock?: {
    description: string;
    extras: ExtraItem[];
  };
}

export interface Menu {
  id: string;
  categories: Category[];

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
