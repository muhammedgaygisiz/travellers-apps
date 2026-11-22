import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import {
  isOpenDay,
  linkNetworkName,
  Restaurant,
  restaurantCategoriesOf,
  RestaurantSection,
  restaurantSetupChecklist,
  SetupItem,
} from 'model';

/**
 * One row of the overview: a section, what it holds now, and where it stands
 * in the setup checklist.
 *
 * `value` is text the restaurant wrote (its description, its street);
 * `valueKeys` are translation keys joined with a middle dot (its categories);
 * `valueKey` is one translated phrase with `valueParams`. A row with none of
 * them shows the "not set yet" phrase.
 */
export interface OverviewRow {
  readonly section: RestaurantSection;
  readonly value?: string;
  readonly valueKeys?: readonly string[];
  readonly valueKey?: string;
  readonly valueParams?: Record<string, unknown>;
  /**
   * Whether the setup checklist counts the section at all. A row it does not
   * count (the map position, ordering at the table) shows no status, so the
   * ticked rows are exactly the "N" of "N of M done" (GitHub issue #2221).
   */
  readonly counted: boolean;
  /** `true` while the setup checklist still counts the section as missing. */
  readonly missing: boolean;
}

/**
 * The menu's row: the one checklist item, "menu reviewed", that is not a
 * restaurant section. It opens the menu editor, or creates the menu
 * (GitHub issue #2221).
 */
export interface OverviewMenuRow {
  readonly valueKey: string;
  /** `true` while the setup checklist still counts the menu as unreviewed. */
  readonly missing: boolean;
}

const hasText = (value: string | undefined): boolean => !!value?.trim();

/** The sections the overview lists as rows; the menu code is an action. */
const ROW_SECTIONS: readonly RestaurantSection[] = [
  'photo',
  'categories',
  'about',
  'links',
  'address',
  'position',
  'opening-hours',
  'facilities',
  'table-ordering',
];

/**
 * What one section holds now, read from the stored restaurant.
 *
 * Exported for its spec: the overview is only as useful as these summaries
 * are right, and a missing one reads as "not set yet" to the owner.
 */
export const overviewRow = (
  restaurant: Restaurant,
  section: RestaurantSection,
  checklist: readonly SetupItem[],
): OverviewRow => {
  const items = checklist.filter((item) => item.target === section);
  const counted = items.length > 0;
  const missing = items.some((item) => !item.done);
  const row = (
    fields: Omit<OverviewRow, 'section' | 'counted' | 'missing'> = {},
  ): OverviewRow => ({ section, counted, missing, ...fields });

  switch (section) {
    case 'photo':
      return missing ? row() : row({ valueKey: 'restaurant-overview-photo' });
    case 'categories': {
      const categories = restaurantCategoriesOf(restaurant);

      return categories.length
        ? row({
            valueKeys: categories.map(
              (category) => `restaurant-category-${category}`,
            ),
          })
        : row();
    }
    case 'about':
      return hasText(restaurant.description)
        ? row({ value: restaurant.description?.trim() })
        : row();
    case 'links': {
      const networks = (restaurant.socialMediaLinks ?? [])
        .filter((link) => hasText(link.url))
        .map((link) => linkNetworkName(link.network))
        .filter(Boolean);

      return networks.length ? row({ value: networks.join(' · ') }) : row();
    }
    case 'address': {
      const { street, postcode, city } = restaurant.address ?? {};
      const place = [postcode, city].filter(hasText).join(' ');
      const value = [street, place].filter(hasText).join(', ');

      return value ? row({ value }) : row();
    }
    case 'position': {
      const { latitude, longitude } = restaurant.position ?? {};

      return latitude || longitude
        ? row({ valueKey: 'restaurant-overview-position' })
        : row();
    }
    case 'opening-hours': {
      // The days guests are shown as open, and no others (#2227).
      const openDays = (restaurant.openingHours ?? []).filter(isOpenDay).length;

      return restaurant.openingHours?.length
        ? row({
            valueKey: 'restaurant-overview-open-days',
            valueParams: { count: openDays },
          })
        : row();
    }
    case 'facilities': {
      const restroom = restaurant.facilities?.genderNeutralRestroom;

      return restroom === undefined
        ? row()
        : row({
            valueKey: restroom
              ? 'restaurant-overview-restroom-yes'
              : 'restaurant-overview-restroom-no',
          });
    }
    case 'table-ordering':
      return row({
        valueKey: restaurant.tableOrdering?.enabled
          ? 'restaurant-overview-ordering-on'
          : 'restaurant-overview-ordering-off',
      });
    default:
      return row();
  }
};

/** What the menu's row says, read from the stored restaurant (#2221). */
export const overviewMenuRow = (
  restaurant: Restaurant,
  checklist: readonly SetupItem[],
): OverviewMenuRow => {
  const missing = checklist.some(
    (item) => item.target === 'edit-menu' && !item.done,
  );

  return {
    missing,
    valueKey: !restaurant.menuId
      ? 'restaurant-overview-menu-none'
      : missing
        ? 'restaurant-overview-menu-unchecked'
        : 'restaurant-overview-menu-checked',
  };
};

/**
 * The business app's restaurant page (GitHub issue #2183): what the restaurant
 * holds now, one row per section, and the ways to its menu, staff and tables.
 *
 * Every row opens one section's own view. The page used to be every form at
 * once, so a checklist item opened it at the top and left the owner to find
 * the field the item meant.
 */
@Component({
  selector: 'bt-restaurant-overview',
  templateUrl: './restaurant-overview.component.html',
  styleUrl: './restaurant-overview.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButton,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantOverviewComponent {
  readonly restaurant = input<Restaurant>();
  /** Bites waiting for a link to a dish (GitHub issue #2216). */
  readonly guestBitesToLink = input(0);

  readonly openSection = output<RestaurantSection>();
  readonly createMenu = output<void>();
  readonly editMenu = output<Restaurant>();
  readonly openGuestBites = output<Restaurant>();
  readonly manageStaff = output<void>();
  readonly editFloorPlan = output<void>();
  readonly openTablePlan = output<void>();

  private readonly checklist = computed(() => {
    const restaurant = this.restaurant();

    return restaurant ? restaurantSetupChecklist(restaurant) : [];
  });

  protected readonly rows = computed(() => {
    const restaurant = this.restaurant();
    const checklist = this.checklist();

    return restaurant
      ? ROW_SECTIONS.map((section) =>
          overviewRow(restaurant, section, checklist),
        )
      : [];
  });

  protected readonly menuRow = computed(() => {
    const restaurant = this.restaurant();

    return restaurant
      ? overviewMenuRow(restaurant, this.checklist())
      : undefined;
  });

  /** The setup progress, while anything is still missing (#2126). */
  protected readonly progress = computed(() => {
    const items = this.checklist();
    const done = items.filter((item) => item.done).length;
    const next = items.find((item) => !item.done);

    return next
      ? {
          done,
          total: items.length,
          percent: Math.round((done / items.length) * 100),
          nextKey: next.labelKey,
        }
      : undefined;
  });

  protected readonly hasMenu = computed(() => !!this.restaurant()?.menuId);

  /** The menu's row: the editor for a menu there is, else a new menu. */
  protected openMenu(): void {
    if (this.hasMenu()) {
      this.gotoEditMenu();
    } else {
      this.createMenu.emit();
    }
  }

  protected gotoGuestBites(): void {
    const restaurant = this.restaurant();

    if (restaurant) {
      this.openGuestBites.emit(restaurant);
    }
  }

  protected gotoEditMenu(): void {
    const restaurant = this.restaurant();

    if (restaurant) {
      this.editMenu.emit(restaurant);
    }
  }
}
