import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Menu } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { MenuListComponent } from '../menu-list.component';

addNecessaryIcons();

const MENU: Menu = {
  id: 'm1',
  categories: [
    {
      id: 'c1',
      title: 'Wok',
      subtitle: 'From the wok',
      items: [
        {
          id: 'd1',
          name: 'Pad Thai',
          description: 'Rice noodles',
          price: 0,
          variants: [
            { id: 'v1', name: 'Vegetarian', description: '', price: 14 },
            {
              id: 'v2',
              name: 'With beef',
              description: '',
              price: 17,
              isAvailable: false,
            },
          ],
        },
        {
          id: 'd2',
          name: 'Margherita',
          description: 'Tomato',
          price: 11,
          variants: [
            {
              id: 'v3',
              name: 'Margherita',
              description: 'Large 40 cm',
              price: 14,
            },
          ],
        },
        { id: 'd3', name: 'Fried rice', description: '', price: 13 },
      ],
      extrasBlock: {
        description: 'Toppings',
        extras: [{ id: 'e1', name: 'Egg', price: 2 }],
      },
    },
    { id: 'c2', title: 'Drinks', items: [] },
  ],
};

/** See GitHub issue #2182. */
describe(MenuListComponent.name, () => {
  let fixture: ComponentFixture<MenuListComponent>;
  let component: MenuListComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });

    fixture = TestBed.createComponent(MenuListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('menu', MENU);
    fixture.componentRef.setInput('currency', 'CHF');
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('lists each dish with its variants under it, each with its own price', () => {
    const [wok] = component.categories();

    expect(wok.dishes[0]).toMatchObject({
      name: 'Pad Thai',
      price: '',
      variants: [
        { name: 'Vegetarian', price: 'CHF 14.00', available: true },
        { name: 'With beef', price: 'CHF 17.00', available: false },
      ],
    });
    expect(wok.dishes[2]).toMatchObject({ price: 'CHF 13.00', variants: [] });
  });

  it('keeps the own price of a dish written before variants had names', () => {
    const margherita = component.categories()[0].dishes[1];

    expect(margherita.price).toBe('CHF 11.00');
    expect(margherita.variants[0].name).toBe('Large 40 cm');
  });

  it('summarises the extras on one line', () => {
    expect(component.categories()[0].extras).toBe('Egg +CHF 2.00');
  });

  it('opens the dish that was tapped', () => {
    const opened = jest.fn();
    component.openDish.subscribe(opened);

    el()
      .querySelector<HTMLElement>(
        '[data-testid="menu-dish-d3"] [data-testid="open-dish"]',
      )
      ?.click();

    expect(opened).toHaveBeenCalledWith({ categoryId: 'c1', itemId: 'd3' });
  });

  it('opens a category from its edit button and from its extras', () => {
    const opened = jest.fn();
    component.openCategory.subscribe(opened);

    el()
      .querySelector<HTMLElement>(
        '[data-testid="menu-category-c1"] [data-testid="edit-category"]',
      )
      ?.click();
    el().querySelector<HTMLElement>('[data-testid="open-extras"]')?.click();

    expect(opened).toHaveBeenNthCalledWith(1, 'c1');
    expect(opened).toHaveBeenNthCalledWith(2, 'c1');
  });

  it('adds a dish to the category it was asked from', () => {
    const added = jest.fn();
    component.addDish.subscribe(added);

    el()
      .querySelector<HTMLElement>(
        '[data-testid="menu-category-c2"] [data-testid="add-dish"]',
      )
      ?.click();

    expect(added).toHaveBeenCalledWith('c2');
  });

  it('passes a switched variant on with where it sits', () => {
    const changed = jest.fn();
    component.availabilityChange.subscribe(changed);

    el()
      .querySelector('[data-testid="menu-variant-v2"] ion-toggle')
      ?.dispatchEvent(
        new CustomEvent('ionChange', { detail: { checked: true } }),
      );

    expect(changed).toHaveBeenCalledWith({
      ref: { categoryId: 'c1', itemId: 'd1', variantId: 'v2' },
      available: true,
    });
  });

  it.each([
    ['categories', 0, 1, 'moveCategory', { from: 0, to: 1 }],
    ['dishes', 2, 0, 'moveDish', { categoryId: 'c1', from: 2, to: 0 }],
  ] as const)(
    'reports a reorder of %s and leaves the order to the saved menu',
    (group, from, to, outputName, expected) => {
      const moved = jest.fn();
      component[outputName].subscribe(moved);
      const complete = jest.fn();
      const target = el().querySelector(
        group === 'categories'
          ? 'ion-reorder-group.categories'
          : '[data-testid="menu-category-c1"] ion-reorder-group.dishes',
      );

      target?.dispatchEvent(
        new CustomEvent('ionItemReorder', { detail: { from, to, complete } }),
      );

      expect(moved).toHaveBeenCalledWith(expected);
      expect(complete).toHaveBeenCalledWith(false);
    },
  );

  it('reports nothing when a reorder ends where it started', () => {
    const moved = jest.fn();
    component.moveCategory.subscribe(moved);

    el()
      .querySelector('ion-reorder-group.categories')
      ?.dispatchEvent(
        new CustomEvent('ionItemReorder', {
          detail: { from: 1, to: 1, complete: jest.fn() },
        }),
      );

    expect(moved).not.toHaveBeenCalled();
  });

  it('says so when a category has no dishes', () => {
    expect(
      el().querySelector('[data-testid="menu-category-c2"] .empty'),
    ).toBeTruthy();
  });
});
