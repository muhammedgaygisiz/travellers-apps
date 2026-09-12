import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MenuItemComponent } from '../menu-item.component';
import { MenuItem } from 'model';
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
});
