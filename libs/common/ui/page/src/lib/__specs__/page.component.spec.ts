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
      });
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
