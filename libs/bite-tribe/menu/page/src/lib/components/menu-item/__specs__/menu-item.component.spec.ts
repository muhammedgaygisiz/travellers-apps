import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MenuItemComponent } from '../menu-item.component';
import { ExtraItem, MenuItem, MenuItemStats } from 'model';
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
      imports: [MenuItemComponent],
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

  /** The restaurant's dietary labels on a row (GitHub issue #2194). */
  describe('dietary labels', () => {
    const render = (item: Partial<MenuItem>): HTMLElement => {
      fixture.componentRef.setInput('item', {
        id: 'd1',
        name: 'Pad Thai',
        description: '',
        price: 12,
        ...item,
      } as MenuItem);
      fixture.detectChanges();

      return fixture.nativeElement as HTMLElement;
    };

    const testIds = (element: HTMLElement, prefix: string): string[] =>
      Array.from(
        element.querySelectorAll(`[data-testid^="${prefix}"]`),
        (node) => node.getAttribute('data-testid') ?? '',
      );

    it('shows the labels and options and names the restaurant as their source', () => {
      const element = render({
        dietaryLabels: ['halal', 'vegetarian'],
        dietaryOptions: ['vegan'],
      });

      expect(testIds(element, 'menu-item-dietary-label-')).toEqual([
        'menu-item-dietary-label-vegetarian',
        'menu-item-dietary-label-halal',
      ]);
      expect(testIds(element, 'menu-item-dietary-option-')).toEqual([
        'menu-item-dietary-option-vegan',
      ]);
      expect(
        element
          .querySelector('[data-testid="menu-item-dietary-source"]')
          ?.textContent?.trim(),
      ).toBe('dietary-declared-by-restaurant');
    });

    it('marks a high-risk label apart from a lifestyle one', () => {
      const element = render({ dietaryLabels: ['vegan', 'gluten-free'] });

      expect(
        element
          .querySelector('[data-testid="menu-item-dietary-label-gluten-free"]')
          ?.classList.contains('dietary-label-high-risk'),
      ).toBe(true);
      expect(
        element
          .querySelector('[data-testid="menu-item-dietary-label-vegan"]')
          ?.classList.contains('dietary-label-high-risk'),
      ).toBe(false);
    });

    it('shows nothing for a value the vocabulary does not know', () => {
      const element = render({
        dietaryLabels: ['keto'] as unknown as MenuItem['dietaryLabels'],
      });

      expect(
        element.querySelector('[data-testid="menu-item-dietary"]'),
      ).toBeNull();
    });

    it('shows a variant its own labels', () => {
      const element = render({
        variants: [
          {
            id: 'v1',
            name: 'Tofu',
            description: '',
            price: 12,
            dietaryLabels: ['vegan'],
          },
        ],
      });

      expect(testIds(element, 'menu-item-dietary-label-')).toEqual([
        'menu-item-dietary-label-vegan',
      ]);
    });
  });
});
