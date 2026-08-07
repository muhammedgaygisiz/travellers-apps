import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageComponent } from '../page.component';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('PageComponent', () => {
  let component: PageComponent;
  let fixture: ComponentFixture<PageComponent>;
  let componentRef: ComponentRef<PageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(PageComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('showMenuPopover', () => {
    it('should show menu popover', async () => {
      const popoverControllerCreateSpy = jest
        .spyOn(component.popoverController, 'create')
        .mockReturnValue({ present: jest.fn() } as unknown as ReturnType<
          typeof component.popoverController.create
        >);

      await component.showMenuPopover({} as MouseEvent);

      expect(popoverControllerCreateSpy).toHaveBeenCalledTimes(1);
    });

    it('forwards the merged menu flags to the popover', async () => {
      componentRef.setInput('menuConfig', {
        settings: true,
        about: true,
        myBites: true,
        myBucketlists: true,
        myProfile: true,
        migrations: true,
        marketPlace: true,
        gallery: true,
        leaderboard: true,
        hideAuth: true,
      });
      const createSpy = jest
        .spyOn(component.popoverController, 'create')
        .mockReturnValue({ present: jest.fn() } as unknown as ReturnType<
          typeof component.popoverController.create
        >);

      await component.showMenuPopover({} as MouseEvent);

      const props = createSpy.mock.calls[0][0].componentProps as Record<
        string,
        () => boolean
      >;
      expect(props['showSettingsButton']()).toBe(true);
      expect(props['showAboutButton']()).toBe(true);
      expect(props['showMyBites']()).toBe(true);
      expect(props['showMyBucketlists']()).toBe(true);
      expect(props['showMyProfile']()).toBe(true);
      expect(props['showMigrationsButton']()).toBe(true);
      expect(props['showMarketPlaceButton']()).toBe(true);
      expect(props['showGalleryButton']()).toBe(true);
      expect(props['showLeaderboardButton']()).toBe(true);
      expect(props['hideAuthButton']()).toBe(true);
    });

    it('defaults unspecified menu flags to false', async () => {
      componentRef.setInput('menuConfig', { settings: true });
      const createSpy = jest
        .spyOn(component.popoverController, 'create')
        .mockReturnValue({ present: jest.fn() } as unknown as ReturnType<
          typeof component.popoverController.create
        >);

      await component.showMenuPopover({} as MouseEvent);

      const props = createSpy.mock.calls[0][0].componentProps as Record<
        string,
        () => boolean
      >;
      expect(props['showSettingsButton']()).toBe(true);
      expect(props['showAboutButton']()).toBe(false);
      expect(props['showLeaderboardButton']()).toBe(false);
    });
  });

  describe('chrome config', () => {
    it('merges a partial chrome config over the defaults', () => {
      componentRef.setInput('chrome', { enableBackButton: true });

      expect(component['chromeConfig']()).toEqual({
        enableBackButton: true,
        showHeaderMenu: true,
        showFooter: true,
        showAddButton: false,
        fullWidth: false,
        desktopLayout: false,
      });
    });
  });

  describe('desktop layout', () => {
    const getNavButton = (target: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(
        `[data-testid="desktop-nav-${target}"]`,
      );

    const getHeaderAddButton = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[data-testid="header-add-button"]');

    const getFooterAddButton = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[data-testid="footer-add-button"]');

    it('promotes no menu entries while the page has not opted in', async () => {
      componentRef.setInput('isAuthenticated', true);
      componentRef.setInput('menuConfig', { myProfile: true, myBites: true });
      await fixture.whenStable();

      expect(component['desktopNavItems']()).toEqual([]);
      expect(getNavButton('profile')).toBeNull();
    });

    it('promotes the top menu entries in the popover order', async () => {
      componentRef.setInput('chrome', { desktopLayout: true });
      componentRef.setInput('isAuthenticated', true);
      componentRef.setInput('menuConfig', {
        myProfile: true,
        myBites: true,
        myBucketlists: true,
        settings: true,
        gallery: true,
      });
      await fixture.whenStable();

      expect(component['desktopNavItems']()).toEqual([
        { target: 'profile', labelKey: 'my-profile' },
        { target: 'my-bites', labelKey: 'my-bites' },
        { target: 'my-bucketlists', labelKey: 'my-bucket-lists' },
      ]);
    });

    it('only promotes entries the page actually offers', async () => {
      componentRef.setInput('chrome', { desktopLayout: true });
      componentRef.setInput('isAuthenticated', true);
      componentRef.setInput('menuConfig', { myBites: true });
      await fixture.whenStable();

      expect(component['desktopNavItems']()).toEqual([
        { target: 'my-bites', labelKey: 'my-bites' },
      ]);
    });

    // The promoted entries all navigate to the signed-in user's own content, so
    // a signed-out visitor has nothing to promote.
    it('promotes nothing while signed out', async () => {
      componentRef.setInput('chrome', { desktopLayout: true });
      componentRef.setInput('isAuthenticated', false);
      componentRef.setInput('menuConfig', { myProfile: true, myBites: true });
      await fixture.whenStable();

      expect(component['desktopNavItems']()).toEqual([]);
    });

    it('emits the menu target when a promoted entry is used', async () => {
      componentRef.setInput('chrome', { desktopLayout: true });
      componentRef.setInput('isAuthenticated', true);
      componentRef.setInput('menuConfig', { myBites: true });
      await fixture.whenStable();
      const navigateSpy = jest.fn();
      component.menuNavigate.subscribe(navigateSpy);

      getNavButton('my-bites')?.click();

      expect(navigateSpy).toHaveBeenCalledWith('my-bites');
    });

    /**
     * Both buttons stay in the DOM and the breakpoint decides which one is
     * shown, so there is no resize state to keep in sync. The footer marks
     * itself with `add-button-in-header`, which is the hook the stylesheet uses
     * to drop the bar at desktop widths — without it the two would be offered
     * at once.
     */
    it('adds the header add button and marks the footer for release', async () => {
      componentRef.setInput('chrome', {
        desktopLayout: true,
        showAddButton: true,
      });
      await fixture.whenStable();

      expect(getHeaderAddButton()).not.toBeNull();
      expect(component['addButtonInHeader']()).toBe(true);
      expect(
        fixture.nativeElement
          .querySelector('ion-footer')
          .classList.contains('add-button-in-header'),
      ).toBe(true);
    });

    it('keeps the add button in the footer without the desktop layout', async () => {
      componentRef.setInput('chrome', { showAddButton: true });
      await fixture.whenStable();

      expect(getHeaderAddButton()).toBeNull();
      expect(getFooterAddButton()).not.toBeNull();
      expect(component['addButtonInHeader']()).toBe(false);
      expect(
        fixture.nativeElement
          .querySelector('ion-footer')
          .classList.contains('add-button-in-header'),
      ).toBe(false);
    });

    it('emits the add click from the header button', async () => {
      componentRef.setInput('chrome', {
        desktopLayout: true,
        showAddButton: true,
      });
      await fixture.whenStable();
      const addSpy = jest.fn();
      component.addButtonClick.subscribe(addSpy);

      getHeaderAddButton()?.click();

      expect(addSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading', () => {
    const getProgressBar = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]');

    it('should not render the progress bar by default', async () => {
      await fixture.whenStable();

      expect(getProgressBar()).toBeNull();
    });

    it('should render an indeterminate progress bar while loading', async () => {
      componentRef.setInput('loading', true);
      await fixture.whenStable();

      expect(getProgressBar()?.getAttribute('type')).toBe('indeterminate');
    });
  });

  describe('app title', () => {
    it('should return input title when provided', () => {
      componentRef.setInput('title', 'Test Title');
      expect(component.appTitle()).toBe('Test Title');
    });

    describe('with injector token', () => {
      const mockAppTitle = 'Mock App Title';

      beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideZonelessChangeDetection(),
            provideIonicAngular(getIonicConfig()),
            { provide: TranslocoService, useValue: MockTranslocoService },
            { provide: APP_TITLE, useValue: mockAppTitle },
          ],
        });
        fixture = TestBed.createComponent(PageComponent);
        component = fixture.componentInstance;
      });

      it('should return appTitleToken when no title is provided', () => {
        expect(component.appTitle()).toBe(mockAppTitle);
      });
    });
  });
});
