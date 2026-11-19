import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { Restaurant, restaurantSetupChecklist } from 'model';
import { of } from 'rxjs';
import { addNecessaryIcons } from 'utils';
import {
  OverviewRow,
  overviewRow,
  RestaurantOverviewComponent,
} from '../restaurant-overview.component';

addNecessaryIcons();

const BARE = {
  id: 'r-1',
  name: 'Trattoria Roma',
  position: { latitude: 0, longitude: 0 },
} as Restaurant;

const COMPLETE: Restaurant = {
  ...BARE,
  imagePath: 'https://example.test/photo.jpg',
  categories: ['restaurant', 'pub'],
  description: '  Wood-fired since 1974.  ',
  socialMediaLinks: [
    { network: 'instagram', url: 'https://instagram.com/x' },
    { network: 'website', url: '' },
  ],
  address: {
    street: 'Via Roma 1',
    postcode: '80100',
    city: 'Napoli',
    country: 'Italy',
  },
  position: { latitude: 40.85, longitude: 14.27 },
  openingHours: [
    { day: 'monday', isOpen: false, timeRanges: [] },
    { day: 'tuesday', isOpen: true, timeRanges: [] },
    { day: 'wednesday', isOpen: true, timeRanges: [] },
  ] as unknown as Restaurant['openingHours'],
  facilities: { genderNeutralRestroom: false },
  tableOrdering: { enabled: true, timeZone: 'Europe/Rome' },
  menuId: 'menu-1',
  menuReviewedAtTimestamp: 1,
};

const rowOf = (
  restaurant: Restaurant,
  section: Parameters<typeof overviewRow>[1],
): OverviewRow =>
  overviewRow(restaurant, section, restaurantSetupChecklist(restaurant));

/** See GitHub issue #2183. */
describe('overviewRow', () => {
  it.each([
    ['photo', { valueKey: 'restaurant-overview-photo' }],
    [
      'categories',
      {
        valueKeys: [
          'restaurant-category-restaurant',
          'restaurant-category-pub',
        ],
      },
    ],
    ['about', { value: 'Wood-fired since 1974.' }],
    ['links', { value: 'Instagram' }],
    ['address', { value: 'Via Roma 1, 80100 Napoli' }],
    ['position', { valueKey: 'restaurant-overview-position' }],
    [
      'opening-hours',
      { valueKey: 'restaurant-overview-open-days', valueParams: { count: 2 } },
    ],
    ['facilities', { valueKey: 'restaurant-overview-restroom-no' }],
    ['table-ordering', { valueKey: 'restaurant-overview-ordering-on' }],
  ] as const)('summarises %s from what is stored', (section, expected) => {
    expect(rowOf(COMPLETE, section)).toEqual({
      section,
      missing: false,
      ...expected,
    });
  });

  it.each([
    'photo',
    'categories',
    'about',
    'links',
    'address',
    'opening-hours',
    'facilities',
  ] as const)('marks %s missing on a bare restaurant', (section) => {
    expect(rowOf(BARE, section)).toEqual({ section, missing: true });
  });

  it('shows no position for the null island a new restaurant starts on', () => {
    expect(rowOf(BARE, 'position')).toEqual({
      section: 'position',
      missing: false,
    });
  });

  it('says table ordering is off when it was never set', () => {
    expect(rowOf(BARE, 'table-ordering').valueKey).toBe(
      'restaurant-overview-ordering-off',
    );
  });

  it('says a stated restroom yes', () => {
    expect(
      rowOf(
        { ...BARE, facilities: { genderNeutralRestroom: true } },
        'facilities',
      ).valueKey,
    ).toBe('restaurant-overview-restroom-yes');
  });

  it('writes an address without a street as the place alone', () => {
    expect(
      rowOf(
        { ...BARE, address: { city: 'Napoli' } as Restaurant['address'] },
        'address',
      ).value,
    ).toBe('Napoli');
  });

  it('shows nothing for the menu code, which is an action rather than a row', () => {
    expect(rowOf(COMPLETE, 'menu-code')).toEqual({
      section: 'menu-code',
      missing: false,
    });
  });
});

describe(RestaurantOverviewComponent.name, () => {
  let fixture: ComponentFixture<RestaurantOverviewComponent>;
  let component: RestaurantOverviewComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: TranslocoService,
          useValue: {
            translate: jest.fn((key: string): string => key),
            config: { reRenderOnLangChange: jest.fn() },
            langChanges$: of(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(RestaurantOverviewComponent);
    component = fixture.componentInstance;
  });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const show = (restaurant: Restaurant | undefined): void => {
    fixture.componentRef.setInput('restaurant', restaurant);
    fixture.detectChanges();
  };

  it('lists one row per section that is filled in', () => {
    show(COMPLETE);

    expect(
      [...el().querySelectorAll('ion-item')].map((item) =>
        item.getAttribute('data-testid'),
      ),
    ).toEqual([
      'restaurant-section-photo',
      'restaurant-section-categories',
      'restaurant-section-about',
      'restaurant-section-links',
      'restaurant-section-address',
      'restaurant-section-position',
      'restaurant-section-opening-hours',
      'restaurant-section-facilities',
      'restaurant-section-table-ordering',
    ]);
  });

  it('lists nothing before the restaurant has loaded', () => {
    show(undefined);

    expect(el().querySelectorAll('ion-item')).toHaveLength(0);
  });

  it('shows the setup progress while something is missing, and not after', () => {
    show(BARE);
    expect(
      el().querySelector('[data-testid="restaurant-setup-progress"]'),
    ).toBeTruthy();

    show(COMPLETE);
    expect(
      el().querySelector('[data-testid="restaurant-setup-progress"]'),
    ).toBeNull();
  });

  it('opens the section of the row that was tapped', () => {
    show(COMPLETE);
    const opened = jest.fn();
    component.openSection.subscribe(opened);

    el()
      .querySelector<HTMLElement>('[data-testid="restaurant-section-about"]')
      ?.click();

    expect(opened).toHaveBeenCalledWith('about');
  });

  it('opens the menu code from its action', () => {
    show(COMPLETE);
    const opened = jest.fn();
    component.openSection.subscribe(opened);

    el()
      .querySelector<HTMLElement>(
        'ion-button[data-testid="restaurant-section-menu-code"]',
      )
      ?.click();

    expect(opened).toHaveBeenCalledWith('menu-code');
  });

  it('edits the menu a restaurant has, and creates one it does not', () => {
    const edited = jest.fn();
    const created = jest.fn();
    component.editMenu.subscribe(edited);
    component.createMenu.subscribe(created);

    show(COMPLETE);
    el()
      .querySelector<HTMLElement>('[data-testid="restaurant-edit-menu"]')
      ?.click();
    expect(edited).toHaveBeenCalledWith(COMPLETE);

    show(BARE);
    el()
      .querySelector<HTMLElement>('[data-testid="restaurant-create-menu"]')
      ?.click();
    expect(created).toHaveBeenCalled();
  });

  it.each([
    ['edit-restaurant-staff', 'manageStaff'],
    ['edit-restaurant-floor-plan', 'editFloorPlan'],
    ['edit-restaurant-table-plan', 'openTablePlan'],
  ] as const)('%s emits %s', (testId, outputName) => {
    show(COMPLETE);
    const emitted = jest.fn();
    component[outputName].subscribe(emitted);

    el().querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.click();

    expect(emitted).toHaveBeenCalled();
  });
});
