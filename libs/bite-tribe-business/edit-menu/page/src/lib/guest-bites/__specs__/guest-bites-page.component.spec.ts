import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Bite, Menu } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { GuestBitesPage } from '../guest-bites-page.component';

addNecessaryIcons();

const MENU: Menu = {
  id: 'menu-1',
  categories: [
    {
      id: 'c1',
      title: 'Pasta',
      items: [
        { id: 'carbonara', name: 'Carbonara', description: '', price: 15 },
        {
          id: 'pizza',
          name: 'Pizza',
          description: '',
          price: 0,
          variants: [
            { id: 'large', name: 'Large', description: '', price: 14 },
          ],
        },
      ],
    },
  ],
};

const BITES = [
  { id: 'match', name: 'carbonara', rating: 4 },
  { id: 'nomatch', name: 'Spaghetti alla carbonara' },
  { id: 'linked', name: 'Carbonara', menuItemId: 'carbonara' },
] as Bite[];

/** The Guest Bites page (GitHub issue #2216). */
describe(GuestBitesPage.name, () => {
  let fixture: ComponentFixture<GuestBitesPage>;
  let component: GuestBitesPage;
  let links: jest.Mock;
  let dismissals: jest.Mock;

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

    fixture = TestBed.createComponent(GuestBitesPage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('menu', MENU);
    fixture.componentRef.setInput('bites', BITES);
    links = jest.fn();
    dismissals = jest.fn();
    component.linkBite.subscribe(links);
    component.dismissBite.subscribe(dismissals);
    fixture.detectChanges();
  });

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  it('lists only the Bites waiting for a link', () => {
    expect(component.rows().map(({ bite }) => bite.id)).toEqual([
      'match',
      'nomatch',
    ]);
    expect(query('[data-testid="guest-bite-linked"]')).toBeNull();
  });

  it('offers Link only where a dish name matches', () => {
    expect(
      query('[data-testid="guest-bite-match"] [data-testid="guest-bite-link"]'),
    ).not.toBeNull();
    expect(
      query(
        '[data-testid="guest-bite-nomatch"] [data-testid="guest-bite-link"]',
      ),
    ).toBeNull();
  });

  it('links a Bite to its suggested dish', () => {
    query(
      '[data-testid="guest-bite-match"] [data-testid="guest-bite-link"]',
    )?.click();

    expect(links).toHaveBeenCalledWith({
      biteId: 'match',
      menuItemId: 'carbonara',
    });
  });

  it('links a Bite to the dish and variant chosen in the picker', () => {
    component.openPicker(BITES[1]);
    expect(component.chosenItemId()).toBeUndefined();

    component.chooseItem('pizza');
    component.chosenVariantId.set('large');
    component.confirmChoice();

    expect(links).toHaveBeenCalledWith({
      biteId: 'nomatch',
      menuItemId: 'pizza',
      variantId: 'large',
    });
    expect(component.choosingFor()).toBeUndefined();
  });

  it('opens the picker on the suggested dish', () => {
    component.openPicker(BITES[0]);

    expect(component.chosenItemId()).toBe('carbonara');
  });

  it('links nothing until a dish is chosen', () => {
    component.openPicker(BITES[1]);
    component.confirmChoice();

    expect(links).not.toHaveBeenCalled();
  });

  it('asks before marking a Bite as not on the menu', async () => {
    let buttons: { role?: string; handler?: () => void }[] = [];
    const present = jest.fn();
    jest
      .spyOn(TestBed.inject(AlertController), 'create')
      .mockImplementation(async (options) => {
        buttons = options?.buttons as typeof buttons;

        return { present } as unknown as HTMLIonAlertElement;
      });

    await component.confirmNotOnMenu(BITES[1]);

    expect(present).toHaveBeenCalled();
    expect(dismissals).not.toHaveBeenCalled();

    buttons.find(({ role }) => role === 'confirm')?.handler?.();

    expect(dismissals).toHaveBeenCalledWith('nomatch');
  });

  it('says so when every Bite is linked', () => {
    fixture.componentRef.setInput('bites', [BITES[2]]);
    fixture.detectChanges();

    expect(query('[data-testid="guest-bites-empty"]')).not.toBeNull();
  });

  it('shows loading until the Bites arrive', () => {
    fixture.componentRef.setInput('bites', undefined);
    fixture.detectChanges();

    expect(query('[data-testid="guest-bites-loading"]')).not.toBeNull();
  });
});
