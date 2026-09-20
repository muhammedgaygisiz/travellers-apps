import { CategoryComponent } from '../category.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Category, ExtraItem } from 'model';
import { MenuItemComponent } from '../../menu-item/menu-item.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const MOZZARELLA: ExtraItem = {
  id: 'extra-mozzarella',
  name: 'Extra mozzarella',
  price: 2,
};

const NDUJA: ExtraItem = { id: 'extra-nduja', name: "'Nduja", price: 2.5 };

describe('CategoryComponent', () => {
  let component: CategoryComponent;
  let fixture: ComponentFixture<CategoryComponent>;

  // `null` rather than `undefined` for "no extras block": a default parameter
  // applies to an explicit `undefined` too, so `pizze(undefined)` would hand
  // back the very extras the test is asserting are absent.
  const pizze = (
    extras: ExtraItem[] | null = [MOZZARELLA, NDUJA],
  ): Category => ({
    id: 'category-pizze',
    title: 'Pizze',
    items: [
      {
        id: 'item-margherita',
        name: 'Margherita',
        description: '',
        price: 12,
      },
    ],
    ...(extras
      ? { extrasBlock: { description: 'Add to any pizza', extras } }
      : {}),
  });

  const withCategory = (category: Category, canAddToCart = false): void => {
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('canAddToCart', canAddToCart);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.detectChanges();
  };

  const extrasBlock = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[data-testid="category-extras"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryComponent],
    })
      .overrideComponent(MenuItemComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CategoryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * The category is where the rule of issue #1598 is applied - a dish's extras
   * are its category's - and where the two ways of showing them are chosen
   * between.
   */
  describe('extras', () => {
    it('prints the category extras when the guest is reading', () => {
      withCategory(pizze());

      expect(extrasBlock()?.textContent).toContain('Add to any pizza');
      expect(extrasBlock()?.textContent).toContain('Extra mozzarella');
      expect(extrasBlock()?.textContent).toContain('2 €');
    });

    /**
     * Two views of one fact rather than both at once. The ordering screen
     * puts a tick box for each of these on every dish above instead, and
     * printing the list as well would be the same two lines twice on the one
     * surface that is a phone held at a table.
     */
    it('prints nothing when the guest is ordering', () => {
      withCategory(pizze(), true);

      expect(extrasBlock()).toBeNull();
    });

    it('prints nothing for a category that offers none', () => {
      withCategory(pizze(null));

      expect(extrasBlock()).toBeNull();
      expect(component.extras()).toEqual([]);
    });

    it('offers its extras to every dish in it', () => {
      withCategory(pizze());

      expect(component.extras()).toEqual([MOZZARELLA, NDUJA]);
    });

    /**
     * A menu that states no currency renders a bare number rather than a
     * guessed symbol, on the same terms as a dish's price (issue #1102).
     */
    it('prices an extra without a symbol when the menu states no currency', () => {
      fixture.componentRef.setInput('category', pizze());
      fixture.detectChanges();

      expect(component.extraPriceLabel(MOZZARELLA)).toBe('2');
    });
  });
});
