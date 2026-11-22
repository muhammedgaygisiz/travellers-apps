import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { Component, ComponentRef, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PositionComponent } from 'bite-tribe-common/map';
import { EditRestaurantComponent } from '../edit-restaurant.component';
import { Address, DaySchedule, Geopoint, Link, Restaurant } from 'model';
import SpyInstance = jest.SpyInstance;
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('leaflet');

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('EditRestaurantComponent', () => {
  let component: EditRestaurantComponent;
  let fixture: ComponentFixture<EditRestaurantComponent>;
  let componentRef: ComponentRef<EditRestaurantComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(EditRestaurantComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * How this restaurant uses its QR codes (GitHub issue #1102).
   *
   * The first writer `Restaurant.tableOrdering` has ever had: issue #1100 added
   * the field and gated every scan on it, so until this control existed a scan
   * in production always refused.
   */
  describe('table ordering', () => {
    const withOrdering = (tableOrdering: Restaurant['tableOrdering']): void => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Sakura Kitchen',
        tableOrdering,
      } as Restaurant);
      fixture.detectChanges();
    };

    it('offers menu-only to a restaurant that has never been asked', () => {
      withOrdering(undefined);

      expect(component.tableOrderingForm.value.enabled).toBe(false);
    });

    /**
     * A restaurant with no configured zone is offered the one its owner is
     * sitting in - right far more often than wrong, and wrong is visible,
     * because the opening hours are read in it.
     */
    it('pre-fills the zone the browser is in', () => {
      withOrdering(undefined);

      expect(component.tableOrderingForm.value.timeZone).toBe(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    });

    it('shows what the restaurant already chose', () => {
      withOrdering({ enabled: true, timeZone: 'Asia/Tokyo' });

      expect(component.tableOrderingForm.value).toEqual({
        enabled: true,
        timeZone: 'Asia/Tokyo',
      });
    });

    it('emits the settings the owner saved', () => {
      withOrdering({ enabled: false, timeZone: 'Europe/Berlin' });
      component.tableOrderingForm.patchValue({ enabled: true });

      const emitted = jest.fn();
      component.submitTableOrderingSettings.subscribe(emitted);
      component.submitTableOrdering();

      expect(emitted).toHaveBeenCalledWith({
        enabled: true,
        timeZone: 'Europe/Berlin',
      });
    });

    /**
     * The pause is a staff action during service and this form never shows it.
     * `updateDocument` replaces a map rather than merging into it, so a save
     * that carried only what the form owns would clear a pause somebody set
     * twenty minutes ago.
     */
    it('carries a staff-side pause through a save it never showed', () => {
      withOrdering({
        enabled: true,
        timeZone: 'Europe/Berlin',
        pausedUntilTimestamp: 1789030800000,
      });

      const emitted = jest.fn();
      component.submitTableOrderingSettings.subscribe(emitted);
      component.submitTableOrdering();

      expect(emitted).toHaveBeenCalledWith({
        enabled: true,
        timeZone: 'Europe/Berlin',
        pausedUntilTimestamp: 1789030800000,
      });
    });

    it('saves nothing without a zone', () => {
      withOrdering({ enabled: true, timeZone: 'Europe/Berlin' });
      component.tableOrderingForm.patchValue({ timeZone: '' });

      const emitted = jest.fn();
      component.submitTableOrderingSettings.subscribe(emitted);
      component.submitTableOrdering();

      expect(emitted).not.toHaveBeenCalled();
    });

    it('offers a list of zones to choose from', () => {
      expect(component.timeZones().length).toBeGreaterThan(0);
    });
  });

  /**
   * The gender-neutral restroom (GitHub issue #1830). Three answers, and
   * "Not stated" emits `undefined` so the write removes the field rather than
   * telling guests "no" on the restaurant's behalf.
   */
  /** The time zone: its own default, and a search (GitHub issue #2228). */
  describe('time zone', () => {
    const MUNICH = { latitude: 48.137, longitude: 11.575 };
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const show = (restaurant: Partial<Restaurant>): void => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Sakura Kitchen',
        ...restaurant,
      } as Restaurant);
      fixture.detectChanges();
    };

    it("offers the zone of the restaurant's own position", () => {
      show({ position: MUNICH });

      expect(component.suggestedTimeZone()).toEqual({
        zone: 'Europe/Berlin',
        source: 'position',
      });
      expect(component.tableOrderingForm.value.timeZone).toBe('Europe/Berlin');
    });

    it('offers the device zone to a restaurant without a position', () => {
      show({ position: { latitude: 0, longitude: 0 } });

      expect(component.suggestedTimeZone()).toEqual({
        zone: device,
        source: 'device',
      });
    });

    it('keeps the zone a restaurant chose', () => {
      show({
        position: MUNICH,
        tableOrdering: { enabled: true, timeZone: 'Asia/Tokyo' },
      });

      expect(component.tableOrderingForm.value.timeZone).toBe('Asia/Tokyo');
    });

    it('does not count the offered zone a change', () => {
      show({ position: MUNICH });

      expect(component.unchanged().tableOrdering).toBe(true);
    });

    it.each([
      ['berlin', 'Europe/Berlin'],
      ['new york', 'America/New_York'],
      ['NEW_YORK', 'America/New_York'],
      ['europe/zur', 'Europe/Zurich'],
    ])('finds a zone by typing %s', (query, zone) => {
      show({ position: MUNICH });
      component.timeZoneQuery.set(query);

      expect(component.matchingTimeZones()).toContain(zone);
      expect(component.matchingTimeZones().length).toBeLessThan(
        component.timeZones().length,
      );
    });

    it('chooses a zone from the search and closes it', () => {
      show({ position: MUNICH });
      component.openTimeZonePicker();
      component.chooseTimeZone('Europe/Zurich');

      expect(component.tableOrderingForm.value.timeZone).toBe('Europe/Zurich');
      expect(component.timeZonePickerOpen()).toBe(false);
      expect(component.unchanged().tableOrdering).toBe(false);
    });

    it('says where an offered zone came from, before it is saved', () => {
      show({ position: MUNICH });
      componentRef.setInput('section', 'table-ordering');
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="table-ordering-time-zone-source"]',
        ),
      ).toBeTruthy();
    });
  });

  describe('facilities', () => {
    const withFacilities = (facilities: Restaurant['facilities']): void => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Sakura Kitchen',
        facilities,
      } as Restaurant);
      fixture.detectChanges();
    };

    it.each([
      [undefined, 'not-stated'],
      [{}, 'not-stated'],
      [{ genderNeutralRestroom: true }, 'yes'],
      [{ genderNeutralRestroom: false }, 'no'],
    ] as const)('shows %j as %s', (facilities, answer) => {
      withFacilities(facilities);

      expect(component.facilitiesForm.value.genderNeutralRestroom).toBe(answer);
    });

    it('shows "Not stated" before the restaurant has loaded', () => {
      fixture.detectChanges();

      expect(component.facilitiesForm.value.genderNeutralRestroom).toBe(
        'not-stated',
      );
    });

    it.each([
      ['yes', true],
      ['no', false],
      ['not-stated', undefined],
    ] as const)('saves %s as %s', (answer, emittedValue) => {
      withFacilities({ genderNeutralRestroom: true });
      component.facilitiesForm.patchValue({ genderNeutralRestroom: answer });

      const emitted = jest.fn();
      component.submitGenderNeutralRestroom.subscribe(emitted);
      component.saveFacilities();

      expect(emitted).toHaveBeenCalledWith(emittedValue);
    });
  });

  /** The kind of venue, up to two of a fixed list (GitHub issue #2131). */
  describe('categories', () => {
    const withCategories = (categories: unknown): void => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Sakura Kitchen',
        categories,
      } as Restaurant);
      fixture.detectChanges();
    };

    it('shows nothing chosen for a restaurant that has not said', () => {
      withCategories(undefined);

      expect(component.categoriesForm.value.categories).toEqual([]);
    });

    it('shows the stated categories, dropping any the list does not know', () => {
      withCategories(['cafe', 'nightclub', 'bakery']);

      expect(component.categoriesForm.value.categories).toEqual([
        'cafe',
        'bakery',
      ]);
    });

    it('saves the chosen categories', () => {
      withCategories(['cafe']);
      component.categoriesForm.patchValue({ categories: ['bar', 'pub'] });

      const emitted = jest.fn();
      component.submitCategories.subscribe(emitted);
      component.saveCategories();

      expect(emitted).toHaveBeenCalledWith(['bar', 'pub']);
    });

    it('saves none as an empty list, which removes the field', () => {
      withCategories(['cafe']);
      component.categoriesForm.patchValue({ categories: [] });

      const emitted = jest.fn();
      component.submitCategories.subscribe(emitted);
      component.saveCategories();

      expect(emitted).toHaveBeenCalledWith([]);
    });

    it('refuses more than two and disables Save', () => {
      withCategories(undefined);
      component.categoriesForm.patchValue({
        categories: ['bar', 'pub', 'cafe'],
      });
      fixture.detectChanges();

      const emitted = jest.fn();
      component.submitCategories.subscribe(emitted);
      component.saveCategories();

      expect(component.categoriesForm.invalid).toBe(true);
      expect(emitted).not.toHaveBeenCalled();
    });
  });

  /** The restaurant's dietary statements and note (GitHub issue #2194). */
  describe('dietary statements', () => {
    const withDietary = (restaurant: Partial<Restaurant>): void => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Green Bowl',
        ...restaurant,
      } as Restaurant);
      fixture.detectChanges();
    };

    it('shows the stated ones, dropping any the list does not know', () => {
      withDietary({
        dietaryStatements: ['fully-halal', 'fully-keto' as never],
        crossContaminationNote: 'Shared fryer.',
      });

      expect(component.dietaryForm.getRawValue()).toEqual({
        statements: ['fully-halal'],
        crossContaminationNote: 'Shared fryer.',
      });
    });

    it('saves the statements and the trimmed note', () => {
      withDietary({});
      component.dietaryForm.patchValue({
        statements: ['fully-kosher'],
        crossContaminationNote: '  No pork in the kitchen. ',
      });

      const emitted = jest.fn();
      component.submitDietaryStatements.subscribe(emitted);
      component.saveDietary();

      expect(emitted).toHaveBeenCalledWith({
        statements: ['fully-kosher'],
        crossContaminationNote: 'No pork in the kitchen.',
      });
    });

    it('refuses a note over the limit', () => {
      withDietary({});
      component.dietaryForm.patchValue({
        crossContaminationNote: 'x'.repeat(501),
      });

      const emitted = jest.fn();
      component.submitDietaryStatements.subscribe(emitted);
      component.saveDietary();

      expect(component.dietaryForm.invalid).toBe(true);
      expect(emitted).not.toHaveBeenCalled();
    });
  });

  describe('links', () => {
    it('should return empty array if no links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      expect(component.links.length).toBe(0);
    });
  });

  describe('initSocialMediaLinks', () => {
    it('should initialize social media links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
          { network: 'instagram', url: 'https://instagram.com/test' },
          { network: 'twitter', url: 'https://twitter.com/test' },
          { network: 'website', url: 'https://test.com' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.links.length).toBe(4);
    });

    it('should handle no social media links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.links.length).toBe(0);
    });
  });

  describe('isInvalid', () => {
    it('should be false if valid links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.isInvalid()).toBe(false);
    });

    it('should be true for a half-filled link', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [{ network: 'facebook', url: '' }] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.isInvalid()).toBe(true);
    });
  });

  describe('placeName', () => {
    it('should return restaurant name', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      expect(component.placeName()).toBe('Test Restaurant');
    });

    it('should return undefined if no restaurant', () => {
      componentRef.setInput('restaurant', undefined);
      expect(component.placeName()).toBe(undefined);
    });
  });

  describe('addSocialMedia', () => {
    it('should add a new social media link', () => {
      const initialLength = component.links.length;
      component.addSocialMedia();
      expect(component.links.length).toBe(initialLength + 1);
    });
  });

  describe('hasMenu', () => {
    it('should return true if restaurant has a menuId', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        menuId: '/menus/menu123',
      } as Restaurant);
      expect(component.hasMenu()).toBe(true);
    });

    it('should return false if restaurant has no menuId', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      expect(component.hasMenu()).toBe(false);
    });

    it('should return false if restaurant is undefined', () => {
      componentRef.setInput('restaurant', undefined);
      expect(component.hasMenu()).toBe(false);
    });
  });

  /** One section at a time (GitHub issue #2183). */
  /**
   * Save stays disabled while a section's form holds what is stored, like the
   * menu editor's (GitHub issue #2222).
   */
  describe('Save without a change', () => {
    const STORED = {
      id: '1',
      name: 'Sakura Kitchen',
      description: 'Ramen since 1990.',
      categories: ['restaurant', 'fine-dining'],
      socialMediaLinks: [
        { network: 'instagram', url: 'https://instagram.com/sakura' },
      ],
      address: {
        street: 'Main St 1',
        postcode: '1000',
        city: 'Ljubljana',
        country: 'Slovenia',
      },
      position: { latitude: 46.05, longitude: 14.5 },
      facilities: { genderNeutralRestroom: true },
      tableOrdering: { enabled: true, timeZone: 'Europe/Ljubljana' },
    } as Restaurant;

    const show = (
      restaurant: Restaurant,
      section: Parameters<typeof componentRef.setInput>[1] = 'about',
    ): void => {
      componentRef.setInput('restaurant', restaurant);
      componentRef.setInput('section', section);
      fixture.detectChanges();
    };

    const saveButton = (testId: string): { disabled?: boolean } | null =>
      (fixture.nativeElement as HTMLElement).querySelector(
        `ion-button[data-testid="${testId}"]`,
      );

    it('counts every section unchanged as it is opened', () => {
      show(STORED);

      expect(component.unchanged()).toEqual({
        categories: true,
        about: true,
        links: true,
        address: true,
        position: true,
        facilities: true,
        tableOrdering: true,
        dietary: true,
      });
    });

    it.each([
      [
        'categories',
        (): void =>
          component.categoriesForm.patchValue({ categories: ['bar'] }),
      ],
      [
        'about',
        (): void =>
          component.descriptionForm.patchValue({ description: 'Udon.' }),
      ],
      [
        'links',
        (): void =>
          component.links.at(0).patchValue({ url: 'https://sakura.si' }),
      ],
      [
        'address',
        (): void => component.addressForm.patchValue({ city: 'Bled' }),
      ],
      [
        'position',
        (): void =>
          component.positionForm.patchValue({
            position: { latitude: 46.37, longitude: 14.11 },
          }),
      ],
      [
        'facilities',
        (): void =>
          component.facilitiesForm.patchValue({ genderNeutralRestroom: 'no' }),
      ],
      [
        'tableOrdering',
        (): void => component.tableOrderingForm.patchValue({ enabled: false }),
      ],
      [
        'dietary',
        (): void =>
          component.dietaryForm.patchValue({ statements: ['fully-halal'] }),
      ],
      [
        'dietary',
        (): void =>
          component.dietaryForm.patchValue({
            crossContaminationNote: 'Nuts in the kitchen.',
          }),
      ],
    ] as const)('counts %s changed once its value differs', (key, change) => {
      show(STORED);
      change();

      expect(component.unchanged()[key]).toBe(false);
    });

    /** The case #2275 was found on: Dietary's Save on an untouched form. */
    it('disables the Dietary Save until a statement or the note differs', () => {
      show(STORED, 'dietary');
      expect(saveButton('save-dietary')?.disabled).toBe(true);

      component.dietaryForm.patchValue({ statements: ['fully-vegetarian'] });
      fixture.detectChanges();
      expect(saveButton('save-dietary')?.disabled).toBe(false);

      component.dietaryForm.patchValue({ statements: [] });
      fixture.detectChanges();
      expect(saveButton('save-dietary')?.disabled).toBe(true);

      // A note that differs only in surrounding spaces is the same note.
      component.dietaryForm.patchValue({ crossContaminationNote: '  ' });
      fixture.detectChanges();
      expect(saveButton('save-dietary')?.disabled).toBe(true);
    });

    it('does not count a change of order in the categories', () => {
      show(STORED);
      component.categoriesForm.patchValue({
        categories: ['fine-dining', 'restaurant'],
      });

      expect(component.unchanged().categories).toBe(true);
    });

    /** The case #2222 was found on: "Not stated" and Save already enabled. */
    it('disables the categories Save until the choice differs, and again when it is undone', () => {
      show({ id: '1', name: 'Sakura Kitchen' } as Restaurant, 'categories');
      expect(saveButton('save-categories')?.disabled).toBe(true);

      component.categoriesForm.patchValue({ categories: ['bar'] });
      fixture.detectChanges();
      expect(saveButton('save-categories')?.disabled).toBe(false);

      component.categoriesForm.patchValue({ categories: [] });
      fixture.detectChanges();
      expect(saveButton('save-categories')?.disabled).toBe(true);
    });

    it.each([
      ['about', 'save-description'],
      ['address', 'save-address'],
      ['facilities', 'save-facilities'],
      ['table-ordering', 'save-table-ordering'],
      ['links', 'save-social-media'],
      ['dietary', 'save-dietary'],
    ] as const)(
      'disables the %s Save while nothing changed',
      (section, testId) => {
        show(STORED, section);

        expect(saveButton(testId)?.disabled).toBe(true);
      },
    );

    /**
     * An unconfigured restaurant is offered the browser's zone; leaving it
     * there with ordering off is not a change the owner made.
     */
    it('does not count the pre-filled zone of an unconfigured restaurant', () => {
      show({ id: '1', name: 'Sakura Kitchen' } as Restaurant);

      expect(component.unchanged().tableOrdering).toBe(true);
    });

    it('does not count a blank row added by mistake as a change', () => {
      show(STORED);
      component.addSocialMedia();

      expect(component.unchanged().links).toBe(true);
    });

    it('counts a removed link as a change', () => {
      show(STORED);
      component.removeSocialMedia(0);

      expect(component.unchanged().links).toBe(false);
    });
  });

  /** Labels above what the owner types, as in the menu editor (#2223). */
  describe('field labels', () => {
    const open = (section: 'about' | 'address' | 'links'): HTMLElement => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Sakura Kitchen',
        socialMediaLinks: [{ network: 'instagram', url: 'https://x.test' }],
      } as Restaurant);
      componentRef.setInput('section', section);
      fixture.detectChanges();

      return fixture.nativeElement as HTMLElement;
    };

    it('stacks every address label above its field', () => {
      const inputs = [...open('address').querySelectorAll('ion-input')];

      expect(inputs).toHaveLength(4);
      inputs.forEach((input) =>
        expect(input.getAttribute('labelPlacement')).toBe('stacked'),
      );
    });

    it('labels the link field, above it, so the label outlasts the URL', () => {
      const input = open('links').querySelector('ion-input');

      expect(input?.getAttribute('labelPlacement')).toBe('stacked');
      // The mocked pipe renders no text; the binding is what is checked.
      expect((input as { label?: string } | null)?.label).toBeDefined();
    });

    it('leaves the About field to its heading, with no label of its own', () => {
      const textarea = open('about').querySelector('ion-textarea');

      expect((textarea as { label?: string } | null)?.label).toBeFalsy();
      expect(textarea?.hasAttribute('aria-label')).toBe(true);
    });
  });

  /** Removing a link, and a row added by mistake (GitHub issue #2224). */
  describe('removing links', () => {
    const LINKS: Link[] = [
      { network: 'instagram', url: 'https://instagram.com/sakura' },
      { network: 'facebook', url: 'https://facebook.com/sakura' },
    ];
    let emitted: jest.Mock;

    const show = (socialMediaLinks: Link[]): HTMLElement => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Sakura Kitchen',
        socialMediaLinks,
      } as Restaurant);
      componentRef.setInput('section', 'links');
      fixture.detectChanges();
      emitted = jest.fn();
      component.submitSocialMediaLinks.subscribe(emitted);

      return fixture.nativeElement as HTMLElement;
    };

    it('removes a row from its button and saves the list without it', () => {
      const el = show(LINKS);

      el.querySelectorAll<HTMLElement>(
        '[data-testid="remove-link"]',
      )[0].click();
      fixture.detectChanges();
      component.saveSocialMediaLinks();

      expect(el.querySelectorAll('ion-item')).toHaveLength(1);
      expect(emitted).toHaveBeenCalledWith({ links: [LINKS[1]] });
    });

    it('saves an empty list once the last link is removed', () => {
      const el = show([LINKS[0]]);

      component.removeSocialMedia(0);
      fixture.detectChanges();

      const save = el.querySelector<HTMLElement & { disabled?: boolean }>(
        'ion-button[data-testid="save-social-media"]',
      );
      expect(save?.disabled).toBe(false);

      component.saveSocialMediaLinks();
      expect(emitted).toHaveBeenCalledWith({ links: [] });
    });

    it('leaves a blank row out of the save, and does not let it block one', () => {
      show(LINKS);
      component.addSocialMedia();
      component.links.at(0).patchValue({ url: 'https://instagram.com/new' });

      expect(component.isInvalid()).toBe(false);
      component.saveSocialMediaLinks();
      expect(emitted).toHaveBeenCalledWith({
        links: [
          { network: 'instagram', url: 'https://instagram.com/new' },
          LINKS[1],
        ],
      });
    });

    it('keeps a row the restaurant is read again under', () => {
      show(LINKS);
      component.removeSocialMedia(0);
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Sakura Kitchen',
        socialMediaLinks: LINKS,
      } as Restaurant);
      fixture.detectChanges();

      expect(component.links.length).toBe(1);
    });

    it('opens a link saved as Twitter as X, without counting that a change', () => {
      show([{ network: 'twitter', url: 'https://twitter.com/sakura' }]);

      expect(component.links.at(0).value.network).toBe('x');
      expect(component.unchanged().links).toBe(true);
    });

    it('offers X and TikTok, and no Twitter', () => {
      expect(component.linkNetworks.map(({ network }) => network)).toEqual([
        'website',
        'instagram',
        'facebook',
        'tiktok',
        'x',
        'linkedin',
      ]);
    });
  });

  /** The position section (GitHub issue #2226). */
  describe('position section', () => {
    /** The map cannot render on the mocked Leaflet; a stub stands in. */
    @Component({
      selector: 'position',
      template: '',
      providers: [
        {
          provide: NG_VALUE_ACCESSOR,
          useExisting: forwardRef(() => PositionStubComponent),
          multi: true,
        },
      ],
    })
    class PositionStubComponent implements ControlValueAccessor {
      readonly gpsPosition = input<Geopoint | null | undefined>();
      writeValue(): void {
        return;
      }
      registerOnChange(): void {
        return;
      }
      registerOnTouched(): void {
        return;
      }
    }

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideIonicAngular(getIonicConfig()),
          { provide: TranslocoService, useValue: MockTranslocoService },
        ],
      });
      TestBed.overrideComponent(EditRestaurantComponent, {
        remove: { imports: [PositionComponent] },
        add: { imports: [PositionStubComponent] },
      });
      fixture = TestBed.createComponent(EditRestaurantComponent);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
    });

    const open = (position: Geopoint | undefined): HTMLElement => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Sakura Kitchen',
        position,
      } as Restaurant);
      componentRef.setInput('section', 'position');
      fixture.detectChanges();

      return fixture.nativeElement as HTMLElement;
    };

    it('says how to move the pin', () => {
      expect(
        open({ latitude: 48.137, longitude: 11.575 }).querySelector(
          '[data-testid="position-hint"]',
        ),
      ).toBeTruthy();
    });

    it('treats the 0, 0 a new restaurant starts on as no position', () => {
      open({ latitude: 0, longitude: 0 });

      expect(component.positionForm.value.position).toBeNull();
    });

    it('keeps a real position', () => {
      open({ latitude: 48.137, longitude: 11.575 });

      expect(component.positionForm.value.position).toEqual({
        latitude: 48.137,
        longitude: 11.575,
      });
    });
  });

  /** The menu code view says "Menu code" once (GitHub issue #2229). */
  it('titles the menu code view once', () => {
    componentRef.setInput('restaurant', {
      id: '1',
      name: 'Sakura Kitchen',
    } as Restaurant);
    componentRef.setInput('section', 'menu-code');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('ion-content h1, ion-content h2')).toHaveLength(
      1,
    );
    expect(el.querySelector('bt-business-menu-qr h2')).toBeNull();
  });

  describe('section', () => {
    it.each([
      ['about', '[data-testid="restaurant-description"]'],
      ['address', '[data-testid="restaurant-street"]'],
      ['categories', '[data-testid="restaurant-categories"]'],
      ['facilities', '[data-testid="gender-neutral-restroom"]'],
      ['table-ordering', '[data-testid="table-ordering-enabled"]'],
      ['menu-code', 'bt-business-menu-qr'],
    ] as const)('shows only the %s fields', (section, selector) => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.setInput('section', section);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(selector)).toBeTruthy();
      expect(
        el.querySelectorAll('ion-button[data-testid^="save-"]').length,
      ).toBeLessThanOrEqual(1);
      const others = [
        '[data-testid="restaurant-description"]',
        '[data-testid="restaurant-street"]',
        '[data-testid="restaurant-categories"]',
        '[data-testid="gender-neutral-restroom"]',
        '[data-testid="table-ordering-enabled"]',
        'bt-business-menu-qr',
      ].filter((other) => other !== selector);
      others.forEach((other) => expect(el.querySelector(other)).toBeNull());
    });
  });

  describe('initDescription', () => {
    /** GitHub issue #2183: the reload after opening a section lands late. */
    it('keeps what the owner typed when the restaurant is read again', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        description: '',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      component.descriptionForm.controls.description.setValue('Typed first');
      component.descriptionForm.markAsDirty();
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        description: '',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.descriptionForm.value.description).toBe('Typed first');
    });

    it.each([
      ['addressForm', { street: 'Typed' }],
      ['facilitiesForm', { genderNeutralRestroom: 'yes' }],
      ['categoriesForm', { categories: ['bar'] }],
      ['tableOrderingForm', { enabled: true }],
      ['positionForm', { position: { latitude: 1, longitude: 2 } }],
    ] as const)(
      'keeps an edited %s when the restaurant is read again',
      (formName, edit) => {
        const form = component[formName] as unknown as {
          patchValue: (v: unknown) => void;
          markAsDirty: () => void;
          value: Record<string, unknown>;
        };
        componentRef.setInput('restaurant', {
          id: '1',
          name: 'R',
        } as Restaurant);
        componentRef.changeDetectorRef.detectChanges();

        form.patchValue(edit);
        form.markAsDirty();
        componentRef.setInput('restaurant', {
          id: '1',
          name: 'R',
        } as Restaurant);
        componentRef.changeDetectorRef.detectChanges();

        expect(form.value).toMatchObject(edit);
      },
    );

    it('keeps edited links when the restaurant is read again', () => {
      componentRef.setInput('restaurant', { id: '1', name: 'R' } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      component.addSocialMedia();
      component.socialMediaForm.markAsDirty();
      componentRef.setInput('restaurant', { id: '1', name: 'R' } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.links.length).toBe(1);
    });

    it('should populate description form from restaurant', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        description: 'A great place to eat',
      } as unknown as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.descriptionForm.value.description).toBe(
        'A great place to eat',
      );
    });

    it('should set empty description when restaurant has no description', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.descriptionForm.value.description).toBe('');
    });
  });

  describe('saveDescription', () => {
    it('should emit submitDescription with description value', () => {
      const emitSpy = jest.spyOn(component.submitDescription, 'emit');
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        description: 'A great place',
      } as unknown as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      component.saveDescription();
      expect(emitSpy).toHaveBeenCalledWith('A great place');
    });

    it('should emit empty string when description is empty', () => {
      const emitSpy = jest.spyOn(component.submitDescription, 'emit');
      component.saveDescription();
      expect(emitSpy).toHaveBeenCalledWith('');
    });
  });

  describe('saveSocialMediaLinks', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.submitSocialMediaLinks, 'emit');
    });

    it('should emit save event if form is valid', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      component.saveSocialMediaLinks();
      expect(emitSpy).toHaveBeenCalledWith({
        links: [{ network: 'facebook', url: 'https://facebook.com/test' }],
      });
    });

    it('should not emit save event if form is invalid', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [{ network: '', url: 'https://x.test' }] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      component.saveSocialMediaLinks();
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('submitOpeningHours', () => {
    it('should have submitOpeningHours output', () => {
      expect(component.submitOpeningHours).toBeDefined();
    });

    it('should emit opening hours when called', () => {
      const emitSpy = jest.spyOn(component.submitOpeningHours, 'emit');
      const hours: DaySchedule[] = [
        {
          day: 'monday',
          isOpen: true,
          timeRanges: [{ from: '09:00', to: '17:00' }],
        },
      ];
      component.submitOpeningHours.emit(hours);
      expect(emitSpy).toHaveBeenCalledWith(hours);
    });
  });

  describe('initAddress', () => {
    it('should populate address form from restaurant', () => {
      const address: Address = {
        street: '123 Main St',
        postcode: '12345',
        city: 'Berlin',
        country: 'Germany',
      };
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        address,
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.addressForm.value).toEqual(address);
    });

    it('should set empty address fields when restaurant has no address', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.addressForm.value).toEqual({
        street: '',
        postcode: '',
        city: '',
        country: '',
      });
    });
  });

  describe('saveAddress', () => {
    it('should emit submitAddress with address values', () => {
      const emitSpy = jest.spyOn(component.submitAddress, 'emit');
      component.addressForm.patchValue({
        street: '123 Main St',
        postcode: '12345',
        city: 'Berlin',
        country: 'Germany',
      });
      component.saveAddress();
      expect(emitSpy).toHaveBeenCalledWith({
        street: '123 Main St',
        postcode: '12345',
        city: 'Berlin',
        country: 'Germany',
      });
    });

    it('should emit empty strings when address fields are empty', () => {
      const emitSpy = jest.spyOn(component.submitAddress, 'emit');
      component.saveAddress();
      expect(emitSpy).toHaveBeenCalledWith({
        street: '',
        postcode: '',
        city: '',
        country: '',
      });
    });
  });

  describe('initPosition', () => {
    it('should populate position form from restaurant', () => {
      const position: Geopoint = { latitude: 52.52, longitude: 13.405 };
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        position,
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.positionForm.value.position).toEqual(position);
    });

    it('should set null position when restaurant has no position', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as unknown as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.positionForm.value.position).toBeNull();
    });
  });

  describe('savePosition', () => {
    it('should emit submitPosition when position is set', () => {
      const emitSpy = jest.spyOn(component.submitPosition, 'emit');
      const position: Geopoint = { latitude: 52.52, longitude: 13.405 };
      component.positionForm.patchValue({ position });
      component.savePosition();
      expect(emitSpy).toHaveBeenCalledWith(position);
    });

    it('should not emit submitPosition when position is null', () => {
      const emitSpy = jest.spyOn(component.submitPosition, 'emit');
      component.positionForm.patchValue({ position: null });
      component.savePosition();
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
