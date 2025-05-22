export interface MenuItem {
  name: string;
  description: string;
  price: number;
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
}
