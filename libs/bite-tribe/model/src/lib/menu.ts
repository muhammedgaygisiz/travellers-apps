export interface MenuItem {
  name: string;
  description: string;
  price: number;
}

interface ExtraItem {
  name: string;
  price: number;
}

interface Category {
  title: string;
  subtitle?: string;

  items: MenuItem[];

  extrasBlock?: {
    description: string;
    extras: ExtraItem[];
  };
}

export interface Menu {
  categories: Category[];
}
