export interface MenuItem {
  name: string;
  description: string;
  ingredients?: string;
  notes?: string;
  price: number;
  isAvailable?: boolean;
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

  /**
   * The restaurant this menu belongs to.
   *
   * A menu used to say nothing about who may write it - the only link was
   * `Restaurant.menuId` pointing the other way - so the ownership-scoped rules
   * had no way to authorise a menu write. The client now names the restaurant
   * on every menu write and the rules verify the claim against that
   * restaurant's `ownerUserId` and `menuId` (GitHub issue #1078).
   *
   * Optional because menus written before that carry no value. Nothing reads
   * it: the rules read the restaurant, not this field, so a menu that predates
   * it is still writable by its owner and simply gains the field on its next
   * save.
   */
  restaurantId?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
