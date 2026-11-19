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
  Restaurant,
  restaurantCategoriesOf,
  RestaurantSection,
  restaurantSetupChecklist,
  SetupItem,
} from 'model';

/**
 * One row of the overview: a section, what it holds now, and whether the
 * setup checklist still counts it as missing.
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
  /** `true` while the setup checklist still counts the section as missing. */
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

const capitalise = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

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
  const missing = checklist.some(
    (item) => item.target === section && !item.done,
  );
  const row = (
    fields: Omit<OverviewRow, 'section' | 'missing'> = {},
  ): OverviewRow => ({ section, missing, ...fields });

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
        .map((link) => capitalise(link.network ?? ''))
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
      const openDays = (restaurant.openingHours ?? []).filter(
        (day) => day.isOpen,
      ).length;

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

  readonly openSection = output<RestaurantSection>();
  readonly createMenu = output<void>();
  readonly editMenu = output<Restaurant>();
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

  protected gotoEditMenu(): void {
    const restaurant = this.restaurant();

    if (restaurant) {
      this.editMenu.emit(restaurant);
    }
  }
}
