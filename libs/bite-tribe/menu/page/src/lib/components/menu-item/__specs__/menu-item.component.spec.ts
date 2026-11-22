import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import {
  TranslocoPipe,
  TranslocoService,
  TranslocoTestingModule,
} from '@jsverse/transloco';
import { MenuItemComponent } from '../menu-item.component';
import { ExtraItem, MenuItem, MenuItemStats, MenuOptionGroup } from 'model';
import SpyInstance = jest.SpyInstance;

@Pipe({
  name: 'transloco',
})
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('MenuItemComponent', () => {
  let component: MenuItemComponent;
  let fixture: ComponentFixture<MenuItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MenuItemComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, de: {} },
          translocoConfig: { availableLangs: ['en', 'de'], defaultLang: 'en' },
        }),
      ],
    })
      .overrideComponent(MenuItemComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MenuItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Prices as money is written (GitHub issue #2261): the currency's
   * minor-unit decimals and the guest's own separator, on the signed-in menu,
   * the public one and the ordering screen alike - they all draw this row.
   */
  describe('the price', () => {
    /** Intl separates a currency from its amount with a no-break space. */
    const plain = (text: string): string => text.replace(/\s/g, ' ');

    const priced = (price: number, currency = 'EUR'): void => {
      fixture.componentRef.setInput('item', {
        id: 'soup',
        name: 'Garnelen-Suppe',
        price,
      } as MenuItem);
      fixture.componentRef.setInput('currency', currency);
    };

    it('writes the two decimals a stored 5.9 dropped', () => {
      priced(5.9);

      expect(plain(component.priceLabel())).toBe('€5.90');
    });

    it("writes them with the guest's separator", () => {
      TestBed.inject(TranslocoService).setActiveLang('de');
      priced(5.9);

      expect(plain(component.priceLabel())).toBe('5,90 €');
    });

    it('writes the decimals of a whole price', () => {
      priced(5);

      expect(plain(component.priceLabel())).toBe('€5.00');
    });

    it('writes no decimals for a currency without minor units', () => {
      priced(1200, 'JPY');

      expect(plain(component.priceLabel())).toBe('¥1,200');
    });

    it('writes an extra the same way, keeping its plus', () => {
      priced(9.5);

      expect(
        plain(
          component.extraPriceLabel({
            id: 'mozzarella',
            name: 'Mozzarella',
            price: 2,
          }),
        ),
      ).toBe('+€2.00');
    });
  });

  describe('onCreateBiteClick', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.createBiteClick, 'emit');
    });

    it('should emit createBiteClick event with item data when itemData is defined', () => {
      const mockItemData = {
        id: 1,
        name: 'Test Item',
        price: 10,
      } as unknown as MenuItem;

      component.onCreateBiteClick(mockItemData);

      expect(emitSpy).toHaveBeenCalledWith(mockItemData);
    });

    it('should not emit createBiteClick event when itemData is undefined', () => {
      component.onCreateBiteClick(undefined);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit createBiteClick event when itemData is unavailable', () => {
      const mockItemData = {
        id: 1,
        name: 'Test Item',
        price: 10,
        isAvailable: false,
      } as unknown as MenuItem;

      component.onCreateBiteClick(mockItemData);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('isUnavailable', () => {
    it('should treat missing availability as available', () => {
      expect(
        component.isUnavailable({ name: 'Test Item' } as unknown as MenuItem),
      ).toBe(false);
    });

    it('should return true when item is explicitly unavailable', () => {
      expect(
        component.isUnavailable({ isAvailable: false } as unknown as MenuItem),
      ).toBe(true);
    });

    /**
     * Availability travels down (issue #1099). A dish taken off the menu takes
     * its sizes with it, so the guest is not shown an orderable variant of an
     * unorderable dish.
     */
    it('should treat a variant of an unavailable dish as unavailable', () => {
      fixture.componentRef.setInput('parentItem', {
        name: 'Plate',
        isAvailable: false,
      } as unknown as MenuItem);

      expect(
        component.isUnavailable({
          name: 'with Beef',
          isAvailable: true,
        } as unknown as MenuItem),
      ).toBe(true);
    });

    it('should leave a variant of an available dish on its own flag', () => {
      fixture.componentRef.setInput('parentItem', {
        name: 'Plate',
        isAvailable: true,
      } as unknown as MenuItem);

      expect(
        component.isUnavailable({ name: 'with Beef' } as unknown as MenuItem),
      ).toBe(false);
      expect(
        component.isUnavailable({
          name: 'with Chicken',
          isAvailable: false,
        } as unknown as MenuItem),
      ).toBe(true);
    });

    it('should refuse a Bite from a variant of an unavailable dish', () => {
      const emitSpy = jest.spyOn(component.createBiteClick, 'emit');
      fixture.componentRef.setInput('parentItem', {
        name: 'Plate',
        isAvailable: false,
      } as unknown as MenuItem);

      component.onCreateBiteClick({
        name: 'with Beef',
        isAvailable: true,
      } as unknown as MenuItem);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  /**
   * The extras picker (GitHub issue #1598).
   *
   * What is asserted is what leaves the row: the cart is keyed and priced off
   * the emitted selection, so a tick that does not reach it is a guest charged
   * for a pizza they asked to have cheese on.
   */
  describe('extras', () => {
    const MARGHERITA: MenuItem = {
      id: 'item-margherita',
      name: 'Margherita',
      description: '',
      price: 12,
    };

    const MOZZARELLA: ExtraItem = {
      id: 'extra-mozzarella',
      name: 'Extra mozzarella',
      price: 2,
    };

    const NDUJA: ExtraItem = {
      id: 'extra-nduja',
      name: "'Nduja",
      price: 2.5,
    };

    let emitSpy: SpyInstance;

    beforeEach(() => {
      fixture.componentRef.setInput('extras', [MOZZARELLA, NDUJA]);
      fixture.componentRef.setInput('canAddToCart', true);
      fixture.componentRef.changeDetectorRef.detectChanges();
      emitSpy = jest.spyOn(component.addToCartClick, 'emit');
    });

    it('emits nothing about extras when none are ticked', () => {
      component.onAddToCartClick(MARGHERITA);

      expect(emitSpy).toHaveBeenCalledWith({ item: MARGHERITA });
    });

    it('emits the extras that are ticked', () => {
      component.toggleExtra(NDUJA.id, true);
      component.onAddToCartClick(MARGHERITA);

      expect(emitSpy).toHaveBeenCalledWith({
        item: MARGHERITA,
        extras: [NDUJA],
      });
    });

    /**
     * In the menu's order rather than the order they were tapped, so a line
     * reads the way the section it came from is printed.
     */
    it('emits them in the order the menu prints them', () => {
      component.toggleExtra(NDUJA.id, true);
      component.toggleExtra(MOZZARELLA.id, true);
      component.onAddToCartClick(MARGHERITA);

      expect(emitSpy).toHaveBeenCalledWith({
        item: MARGHERITA,
        extras: [MOZZARELLA, NDUJA],
      });
    });

    it('drops an extra that is unticked again', () => {
      component.toggleExtra(MOZZARELLA.id, true);
      component.toggleExtra(MOZZARELLA.id, false);

      expect(component.isTicked(MOZZARELLA.id)).toBe(false);

      component.onAddToCartClick(MARGHERITA);

      expect(emitSpy).toHaveBeenCalledWith({ item: MARGHERITA });
    });

    /**
     * A tick is part of building one line rather than a preference about the
     * dish. A picker that stayed ticked would quietly charge a guest for
     * cheese a second time.
     */
    it('clears the ticks once the row is added', () => {
      component.toggleExtra(MOZZARELLA.id, true);
      component.onAddToCartClick(MARGHERITA);

      expect(component.isTicked(MOZZARELLA.id)).toBe(false);

      component.onAddToCartClick(MARGHERITA);

      expect(emitSpy).toHaveBeenLastCalledWith({ item: MARGHERITA });
    });

    it('names the dish rather than the size when a variant is added', () => {
      const large: MenuItem = {
        id: 'variant-large',
        name: 'Large',
        description: '',
        price: 16,
      };
      fixture.componentRef.setInput('parentItem', MARGHERITA);
      fixture.componentRef.changeDetectorRef.detectChanges();

      component.toggleExtra(MOZZARELLA.id, true);
      component.onAddToCartClick(large);

      expect(emitSpy).toHaveBeenCalledWith({
        item: MARGHERITA,
        variant: large,
        extras: [MOZZARELLA],
      });
    });
  });
  /** Options: choices on a dish that don't change its price (#2254). */
  describe('options', () => {
    const HEAT: MenuOptionGroup = {
      id: 'heat',
      name: 'Zubereitungsart',
      required: true,
      choices: [
        { id: 'mild', name: 'nicht scharf' },
        { id: 'hot', name: 'scharf' },
      ],
    };
    const SAUCE: MenuOptionGroup = {
      id: 'sauce',
      name: 'Sauce',
      required: false,
      choices: [
        { id: 'side', name: 'on the side' },
        { id: 'over', name: 'over it' },
      ],
    };
    const CHOP_SUEY: MenuItem = {
      id: 'chop-suey',
      name: 'Chop-Suey-Spezial',
      description: '',
      price: 12.9,
      optionGroups: [HEAT, SAUCE],
    };
    const GROSS: MenuItem = {
      id: 'gross',
      name: 'groß',
      description: '',
      price: 15.4,
    };

    let emitSpy: SpyInstance;

    const render = (item: MenuItem, canAddToCart: boolean): HTMLElement => {
      fixture.componentRef.setInput('item', item);
      fixture.componentRef.setInput('canAddToCart', canAddToCart);
      fixture.componentRef.changeDetectorRef.detectChanges();
      emitSpy = jest.spyOn(component.addToCartClick, 'emit');

      return fixture.nativeElement as HTMLElement;
    };

    it('reads as one line per option where nothing is ordered', () => {
      const el = render(CHOP_SUEY, false);

      expect(
        [...el.querySelectorAll('[data-testid="menu-item-option-line"]')].map(
          (line) => line.textContent?.trim(),
        ),
      ).toEqual([
        'Zubereitungsart: nicht scharf · scharf',
        'Sauce: on the side · over it',
      ]);
      expect(el.querySelector('[data-testid="menu-item-options"]')).toBeNull();
    });

    it('offers the choices on the ordering screen instead', () => {
      const el = render(CHOP_SUEY, true);

      expect(
        el.querySelector('[data-testid="menu-item-options"]'),
      ).not.toBeNull();
      expect(
        el.querySelector('[data-testid="menu-item-option-line"]'),
      ).toBeNull();
    });

    it('blocks adding until every required option is chosen, and says which', () => {
      const el = render(CHOP_SUEY, true);

      expect(component.missingOptions()).toEqual([HEAT]);
      expect(
        el.querySelector('[data-testid="menu-item-option-hint"]'),
      ).not.toBeNull();

      component.onAddToCartClick(CHOP_SUEY);
      expect(emitSpy).not.toHaveBeenCalled();

      component.choose('heat', 'hot');
      fixture.componentRef.changeDetectorRef.detectChanges();
      expect(
        el.querySelector('[data-testid="menu-item-option-hint"]'),
      ).toBeNull();
    });

    it("emits the chosen options in the dish's order, and then forgets them", () => {
      render(CHOP_SUEY, true);
      component.choose('sauce', 'side');
      component.choose('heat', 'hot');

      component.onAddToCartClick(CHOP_SUEY);

      expect(emitSpy).toHaveBeenCalledWith({
        item: CHOP_SUEY,
        options: [
          { group: HEAT, choice: HEAT.choices[1] },
          { group: SAUCE, choice: SAUCE.choices[0] },
        ],
      });
      expect(component.chosenChoice('heat')).toBeUndefined();
    });

    it('lets an optional option be cleared again', () => {
      render(CHOP_SUEY, true);
      component.choose('heat', 'mild');
      component.choose('sauce', 'side');
      component.choose('sauce', undefined);

      component.onAddToCartClick(CHOP_SUEY);

      expect(emitSpy).toHaveBeenCalledWith({
        item: CHOP_SUEY,
        options: [{ group: HEAT, choice: HEAT.choices[0] }],
      });
    });

    it("adds the dish's options to a variant added below it", () => {
      render({ ...CHOP_SUEY, price: 0, variants: [GROSS] }, true);
      component.choose('heat', 'mild');

      component.onVariantAdded({ item: CHOP_SUEY, variant: GROSS });

      expect(emitSpy).toHaveBeenCalledWith({
        item: CHOP_SUEY,
        variant: GROSS,
        options: [{ group: HEAT, choice: HEAT.choices[0] }],
      });
    });

    it('adds no variant while a required option is open', () => {
      render({ ...CHOP_SUEY, price: 0, variants: [GROSS] }, true);

      component.onVariantAdded({ item: CHOP_SUEY, variant: GROSS });

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('lets a variant row refuse to add while its dish is blocked', () => {
      fixture.componentRef.setInput('optionsBlocked', true);
      fixture.componentRef.setInput('parentItem', CHOP_SUEY);
      render(GROSS, true);

      component.onAddToCartClick(GROSS);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('draws no options on a variant row', () => {
      fixture.componentRef.setInput('isVariant', true);
      const el = render({ ...GROSS, optionGroups: [HEAT] }, true);

      expect(component.optionGroups()).toEqual([]);
      expect(el.querySelector('[data-testid="menu-item-options"]')).toBeNull();
    });
  });

  /** A dish sold only as its variants (GitHub issue #2182). */
  describe('ordering a dish with variants', () => {
    const withItem = (item: MenuItem, isVariant = false): void => {
      fixture.componentRef.setInput('item', item);
      fixture.componentRef.setInput('canAddToCart', true);
      fixture.componentRef.setInput('isVariant', isVariant);
      fixture.componentRef.changeDetectorRef.detectChanges();
    };

    const variants = [
      { id: 'v1', name: 'Vegetarian', description: '', price: 14 },
    ];

    it('offers no plain line for a dish without a price of its own', () => {
      withItem({
        id: 'd1',
        name: 'Pad Thai',
        description: '',
        price: 0,
        variants,
      });

      expect(component.orderable()).toBe(false);
    });

    it('keeps the plain line of a dish written with its own price', () => {
      withItem({
        id: 'd1',
        name: 'Margherita',
        description: '',
        price: 11,
        variants,
      });

      expect(component.orderable()).toBe(true);
    });

    it('orders a dish without variants and every variant row', () => {
      withItem({ id: 'd2', name: 'Fried rice', description: '', price: 13 });
      expect(component.orderable()).toBe(true);

      withItem(variants[0], true);
      expect(component.orderable()).toBe(true);
    });
  });

  describe('the Bite signal', () => {
    const DISH: MenuItem = {
      id: 'margherita',
      name: 'Margherita',
      description: '',
      price: 12,
    };

    const signal = (): HTMLElement | null =>
      fixture.nativeElement.querySelector(
        '[data-testid="menu-item-bite-signal"]',
      );

    const render = (stats: MenuItemStats | undefined): void => {
      fixture.componentRef.setInput('item', DISH);
      fixture.componentRef.setInput('stats', stats);
      fixture.detectChanges();
    };

    it('should say nothing about a dish nobody has written about', () => {
      render(undefined);

      expect(signal()).toBeNull();
    });

    it('should count the Bites of a dish nobody rated, without an average', () => {
      render({
        id: DISH.id,
        restaurantId: 'trattoria',
        biteCount: 3,
        ratingCount: 0,
        ratingSum: 0,
        updatedAt: 0,
      });

      // Zero would read as a dish everybody hated rather than one nobody rated.
      expect(signal()?.textContent).toContain('menu-item-bite-signal');
      expect(signal()?.textContent).not.toContain('rated');
    });

    it('should show the average to one decimal where there is one', () => {
      render({
        id: DISH.id,
        restaurantId: 'trattoria',
        biteCount: 4,
        ratingCount: 3,
        ratingSum: 13,
        updatedAt: 0,
      });

      expect(signal()?.textContent).toContain('menu-item-bite-signal-rated');
      expect(component['averageRating']()).toBe('4.3');
    });

    it('should ask for the Bites of the dish that was tapped', () => {
      const emitSpy = jest.spyOn(component.biteSignalClick, 'emit');
      render({
        id: DISH.id,
        restaurantId: 'trattoria',
        biteCount: 1,
        ratingCount: 1,
        ratingSum: 5,
        updatedAt: 0,
      });

      signal()?.click();

      expect(emitSpy).toHaveBeenCalledWith(DISH);
    });
  });
});
