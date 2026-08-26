import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { addNecessaryIcons } from 'utils';
import { of } from 'rxjs';
import type { Menu, Restaurant } from 'model';
import { MenuPage } from '../menu-page.component';
import { MenuComponent } from '../../menu/menu.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const RESTAURANT = {
  name: 'China Wok',
  image: 'restaurant.jpg',
} as Restaurant;

describe(MenuPage.name, () => {
  let fixture: ComponentFixture<MenuPage>;
  let componentRef: ComponentRef<MenuPage>;

  const query = (selector: string): Element | null =>
    fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    })
      .overrideComponent(MenuPage, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .overrideComponent(MenuComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MenuPage);
    componentRef = fixture.componentRef;
    componentRef.setInput('restaurant', RESTAURANT);
    fixture.detectChanges();
  });

  describe('given a menu that is still loading', () => {
    beforeEach(() => {
      componentRef.setInput('isMenuLoading', true);
      fixture.detectChanges();
    });

    it('should show the skeleton state', () => {
      expect(query('[data-testid="menu-loading-skeleton"]')).toBeTruthy();
    });

    it('should not show the empty state, which would claim there is no menu', () => {
      expect(query('bt-menu')).toBeNull();
    });

    it('should reserve no space for an image it cannot show yet', () => {
      expect(query('ion-img')).toBeNull();
    });
  });

  describe('given a menu that could not be resolved', () => {
    beforeEach(() => {
      componentRef.setInput('isMenuUnavailable', true);
      fixture.detectChanges();
    });

    it('should explain the failure instead of showing the empty state', () => {
      expect(query('[data-testid="menu-error-message"]')).toBeTruthy();
      expect(query('bt-menu')).toBeNull();
    });

    it('should offer the way back', () => {
      const goBack = jest.fn();
      fixture.componentInstance.goBack.subscribe(goBack);

      (query('[data-testid="menu-error-go-back"]') as HTMLElement).click();

      expect(goBack).toHaveBeenCalled();
    });

    it('should offer the read again', () => {
      const retryLoad = jest.fn();
      fixture.componentInstance.retryLoad.subscribe(retryLoad);

      (query('[data-testid="menu-error-retry"]') as HTMLElement).click();

      expect(retryLoad).toHaveBeenCalled();
    });
  });

  describe('given a loaded menu with no items', () => {
    beforeEach(() => {
      componentRef.setInput('menu', {
        id: 'menu-1',
        categories: [],
      } as unknown as Menu);
      fixture.detectChanges();
    });

    it('should keep the empty state it has always had', () => {
      expect(query('bt-menu')).toBeTruthy();
      expect(query('[data-testid="menu-loading-skeleton"]')).toBeNull();
      expect(query('[data-testid="menu-error-message"]')).toBeNull();
    });

    it('should show the restaurant photo', () => {
      expect(query('ion-img')).toBeTruthy();
    });
  });

  describe('given a loaded page for a restaurant with no photo', () => {
    it('should render no image at all rather than an empty one', () => {
      // The header used to reserve 300px for an `ion-img` with no source, which
      // read as a broken page. See GitHub issue #1382.
      componentRef.setInput('restaurant', { name: 'China Wok' } as Restaurant);
      fixture.detectChanges();

      expect(query('ion-img')).toBeNull();
    });
  });
});
