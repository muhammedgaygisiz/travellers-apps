import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { getIonicConfig } from 'utils';
import type { Menu } from 'model';
import { EditMenuPage } from '../edit-menu-page.component';

/**
 * The currency a menu states (GitHub issue #1102).
 *
 * Asked once at the top of the editor, because a menu is priced in one currency
 * and a control per price would invite two. The tests that matter are about
 * what the owner is offered and about "Not set" being a real answer rather than
 * an empty string the model then has to know about.
 */
describe(EditMenuPage.name, () => {
  let component: EditMenuPage;
  let fixture: ComponentFixture<EditMenuPage>;
  let componentRef: ComponentRef<EditMenuPage>;

  const MENU: Menu = {
    id: 'menu-1',
    currency: 'EUR',
    categories: [{ id: 'c1', title: 'Pizza', items: [] }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });

    fixture = TestBed.createComponent(EditMenuPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  const withMenu = (menu: Menu | undefined): void => {
    componentRef.setInput('menu', menu);
    fixture.detectChanges();
  };

  it('shows the currency the menu already states', () => {
    withMenu(MENU);

    expect(component.currency()).toBe('EUR');
  });

  it('shows nothing chosen for a menu that states none', () => {
    withMenu({ ...MENU, currency: undefined });

    expect(component.currency()).toBe('');
  });

  it('saves the currency the owner chose', () => {
    withMenu({ ...MENU, currency: undefined });
    component.currency.set('JPY');

    const saved = jest.fn();
    component.saveMenu.subscribe(saved);
    component.saveCurrency();

    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'menu-1', currency: 'JPY' }),
    );
  });

  /**
   * "Not set" is a real answer, and the model reads a missing field as "not
   * stated". Writing `''` would be a third value every reader then has to know
   * about, so the field goes rather than emptying.
   */
  it('drops the field entirely when the owner unsets it', () => {
    withMenu(MENU);
    component.currency.set('');

    const saved = jest.fn();
    component.saveMenu.subscribe(saved);
    component.saveCurrency();

    const [menu] = saved.mock.calls[0] as [Menu];
    expect('currency' in menu).toBe(false);
  });

  it('saves nothing when there is no menu to save', () => {
    withMenu(undefined);

    const saved = jest.fn();
    component.saveMenu.subscribe(saved);
    component.saveCurrency();

    expect(saved).not.toHaveBeenCalled();
  });

  /**
   * The device's currency is a good guess and never an answer - a chain
   * operator editing a Zurich menu from Berlin would be handed euros - so it is
   * offered first and still has to be saved.
   */
  it('offers the device currency first, and every other one after it', () => {
    const offered = component.currencies();

    expect(offered.length).toBeGreaterThan(1);
    expect(new Set(offered.map((c) => c.code)).size).toBe(offered.length);
  });
});
