import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { getIonicConfig } from 'utils';
import type { Menu } from 'model';
import { MenuComponent } from '../menu.component';

const MENU: Menu = {
  id: 'm1',
  currency: 'EUR',
  categories: [
    {
      id: 'c1',
      title: 'Pizze',
      items: [{ id: 'i1', name: 'Margherita', description: '', price: 9 }],
    },
    { id: 'c2', title: 'Bevande', subtitle: 'Drinks', items: [] },
    {
      id: 'c3',
      title: 'Extras only',
      items: [],
      extrasBlock: {
        description: 'Add to any pizza',
        extras: [{ id: 'e1', name: 'Nduja', price: 2.5 }],
      },
    },
  ],
};

/** What a guest is shown of a menu's categories (GitHub issue #2280). */
describe(MenuComponent.name, () => {
  let fixture: ComponentFixture<MenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MenuComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [provideIonicAngular(getIonicConfig())],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
  });

  const show = (menu: Menu): HTMLElement => {
    fixture.componentRef.setInput('menu', menu);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  it('shows only the categories with a dish in them', () => {
    show(MENU);

    expect(
      fixture.componentInstance.visibleCategories().map(({ id }) => id),
    ).toEqual(['c1']);
  });

  it('never prints the empty-category note to a guest', () => {
    const el = show(MENU);

    expect(el.textContent).not.toContain('menu-category-empty');
    expect(el.textContent).not.toContain('Bevande');
  });

  it('reads as no menu when every category is empty', () => {
    const el = show({ ...MENU, categories: [MENU.categories[1]] });

    expect(el.textContent).toContain('no-menu-yet');
  });
});
