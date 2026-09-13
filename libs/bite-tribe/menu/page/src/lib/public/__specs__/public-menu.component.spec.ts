import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  WritableSignal,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import {
  PublicMenuService,
  type PublicMenuView,
} from 'bite-tribe/menu-data-access';
import { PublicMenu } from '../public-menu.component';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

/**
 * What somebody with no account actually reads (GitHub issue #1102).
 *
 * The two assertions that earn this file are about what is *absent*: no "create
 * a Bite" button, because the reader may have no BiteTribe account and that
 * button opens a sign-up for a product they came here to read a menu of; and no
 * euro sign on a menu that never stated a currency.
 */
const RESTAURANT = { id: 'restaurant-1', name: 'Sakura Kitchen' };

const MENU = {
  id: 'menu-1',
  currency: 'JPY',
  categories: [
    {
      id: 'c1',
      title: 'Ramen',
      items: [
        { id: 'i1', name: 'Shoyu', description: 'Soy broth', price: 1200 },
        {
          id: 'i2',
          name: 'Tonkotsu',
          description: 'Pork broth',
          price: 1400,
          isAvailable: false,
        },
      ],
    },
  ],
};

const en = {
  'public-menu-loading': 'Loading the menu...',
  'public-menu-refused-title': "This menu isn't available",
  'public-menu-refused-menuMissing':
    "This restaurant hasn't published a menu yet.",
  'public-menu-failed-title': "We couldn't load the menu",
  'public-menu-failed-body': 'Check your connection and try again.',
  'public-menu-try-again': 'Try again',
  'menu-item-not-available': 'Not available',
  'create-bite': 'Create Bite',
  'no-menu-yet': 'No menu yet',
};

describe(PublicMenu.name, () => {
  let fixture: ComponentFixture<PublicMenu>;
  let state: WritableSignal<PublicMenuView>;
  let load: jest.Mock;
  let retry: jest.Mock;

  const show = (next: PublicMenuView): void => {
    state.set(next);
    fixture.detectChanges();
  };

  const render = (): void => {
    fixture = TestBed.createComponent(PublicMenu);
    fixture.detectChanges();
  };

  const text = (): string => fixture.nativeElement.textContent ?? '';

  const has = (testId: string): boolean =>
    !!fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(() => {
    state = signal<PublicMenuView>({ kind: 'loading' });
    load = jest.fn().mockResolvedValue(undefined);
    retry = jest.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en },
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
        provideRouter([]),
        {
          provide: PublicMenuService,
          useValue: { state, menu: signal(MENU), load, retry },
        },
      ],
    })
      .overrideComponent(PublicMenu, { set: { providers: [] } })
      .compileComponents();
  });

  it('loads the menu as soon as it opens', () => {
    render();

    expect(load).toHaveBeenCalled();
    expect(has('public-menu-loading')).toBe(true);
  });

  it('names the restaurant and renders its dishes', () => {
    render();

    show({ kind: 'menu', restaurant: RESTAURANT, menu: MENU });

    expect(text()).toContain('Sakura Kitchen');
    expect(text()).toContain('Shoyu');
    expect(text()).toContain('Tonkotsu');
  });

  /**
   * The criterion "unavailable items cannot be ordered", as it reads on a page
   * where nothing can be ordered yet: the dish is visibly marked.
   */
  it('marks a dish the kitchen is not serving', () => {
    render();

    show({ kind: 'menu', restaurant: RESTAURANT, menu: MENU });

    expect(text()).toContain('Not available');
  });

  /**
   * The reader may have no BiteTribe account at all. Offering the button would
   * open a sign-up for a product they came here to read a menu of.
   */
  it('offers no way to create a Bite', () => {
    render();

    show({ kind: 'menu', restaurant: RESTAURANT, menu: MENU });

    expect(text()).not.toContain('Create Bite');
  });

  /**
   * The price used to carry a hardcoded euro sign, which was wrong for every
   * restaurant outside the euro zone and wrong silently.
   */
  it('prices in the currency the menu states', () => {
    render();

    show({ kind: 'menu', restaurant: RESTAURANT, menu: MENU });

    expect(text()).toContain('¥');
    expect(text()).not.toContain('€');
  });

  it('shows a bare number when the menu states no currency', () => {
    render();

    show({
      kind: 'menu',
      restaurant: RESTAURANT,
      menu: { ...MENU, currency: undefined },
    });

    expect(text()).toContain('1200');
    expect(text()).not.toContain('€');
  });

  it('says why when there is no menu to show', () => {
    render();

    show({ kind: 'refused', reason: 'menuMissing' });

    expect(
      fixture.nativeElement
        .querySelector('[data-testid="public-menu-reason"]')
        ?.textContent?.trim(),
    ).toBe("This restaurant hasn't published a menu yet.");
  });

  it('keeps a transport failure apart from a refusal', () => {
    render();

    show({ kind: 'failed' });

    expect(has('public-menu-refused')).toBe(false);
    expect(has('public-menu-failed')).toBe(true);
  });

  it('asks again when the reader retries', () => {
    render();
    show({ kind: 'failed' });

    fixture.nativeElement
      .querySelector('[data-testid="public-menu-retry"]')
      ?.dispatchEvent(new Event('click'));

    expect(retry).toHaveBeenCalled();
  });

  it('reports the screen to analytics', () => {
    render();

    fixture.componentInstance.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Public Menu',
    });
  });
});
