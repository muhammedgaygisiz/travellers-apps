import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { rootEffectsInit } from '@ngrx/effects';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Platform } from '@ionic/angular/standalone';
import { AppUpdateService } from 'utils';
import { of, Subject, type Subscription } from 'rxjs';
import { ServiceWorkerEffects } from '../effects';

type Visibility = 'visible' | 'hidden';

const versionReady: VersionEvent = {
  type: 'VERSION_READY',
  currentVersion: { hash: 'old' },
  latestVersion: { hash: 'new' },
};

const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A ready update is offered in the menu instead of a dialog (issue #2135). A
 * background tab still applies it itself rather than stay on an old build for
 * days (issue #1904).
 */
describe(ServiceWorkerEffects.name, () => {
  let versionUpdates: Subject<VersionEvent>;
  let subscription: Subscription;
  let visibility: Visibility;
  let visibilityListeners: Array<() => void>;
  let appUpdate: AppUpdateService;

  const swUpdate = {
    versionUpdates: new Subject<VersionEvent>(),
    activateUpdate: jest.fn(),
  };
  const reload = jest.fn();
  const platform = { is: jest.fn() };
  const fakeDocument = {
    get visibilityState(): Visibility {
      return visibility;
    },
    location: { reload },
    addEventListener: jest.fn((_: string, listener: () => void) => {
      visibilityListeners.push(listener);
    }),
    removeEventListener: jest.fn((_: string, listener: () => void) => {
      visibilityListeners = visibilityListeners.filter((l) => l !== listener);
    }),
  };

  const goHidden = (): void => {
    visibility = 'hidden';
    visibilityListeners.forEach((listener) => listener());
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    versionUpdates = new Subject<VersionEvent>();
    swUpdate.versionUpdates = versionUpdates;
    swUpdate.activateUpdate.mockResolvedValue(true);
    visibility = 'visible';
    visibilityListeners = [];
    platform.is.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        ServiceWorkerEffects,
        provideMockActions(() => of(rootEffectsInit())),
        { provide: SwUpdate, useValue: swUpdate },
        { provide: Platform, useValue: platform },
        { provide: DOCUMENT, useValue: fakeDocument },
      ],
    });
    appUpdate = TestBed.inject(AppUpdateService);
    subscription =
      TestBed.inject(ServiceWorkerEffects).swUpdateEffect$.subscribe();
  });

  afterEach(() => {
    subscription.unsubscribe();
    jest.restoreAllMocks();
  });

  describe('VERSION_READY in a hidden tab', () => {
    beforeEach(async () => {
      visibility = 'hidden';
      versionUpdates.next(versionReady);
      await flush();
    });

    it('applies the update and reloads', () => {
      expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not offer it in the menu', () => {
      expect(appUpdate.ready()).toBe(false);
    });
  });

  it('still reloads when activating the update fails', async () => {
    swUpdate.activateUpdate.mockRejectedValue(new Error('boom'));
    visibility = 'hidden';

    versionUpdates.next(versionReady);
    await flush();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('opens nothing and announces nothing while a version only downloads', async () => {
    versionUpdates.next({
      type: 'VERSION_DETECTED',
      version: { hash: 'new' },
    });
    await flush();

    expect(appUpdate.ready()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  describe('VERSION_READY in a visible tab', () => {
    beforeEach(async () => {
      versionUpdates.next(versionReady);
      await flush();
    });

    it('offers the update in the menu and does not reload by itself', () => {
      expect(appUpdate.ready()).toBe(true);
      expect(reload).not.toHaveBeenCalled();
    });

    it('reloads once when the member taps the menu row', async () => {
      appUpdate.apply();
      appUpdate.apply();
      await flush();

      expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('applies the update when the member leaves the tab', async () => {
      goHidden();
      await flush();

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('stops watching the tab once it applied the update', async () => {
      goHidden();
      await flush();

      expect(visibilityListeners).toHaveLength(0);
    });
  });

  it('handles NO_NEW_VERSION_DETECTED instead of logging it as unhandled', async () => {
    versionUpdates.next({
      type: 'NO_NEW_VERSION_DETECTED',
      version: { hash: 'current' },
    });
    await flush();

    expect(console.log).not.toHaveBeenCalledWith(
      'Unhandled event type:',
      expect.anything(),
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing on native builds', async () => {
    platform.is.mockImplementation((p: string) => p === 'hybrid');
    visibility = 'hidden';

    versionUpdates.next(versionReady);
    await flush();

    expect(reload).not.toHaveBeenCalled();
    expect(appUpdate.ready()).toBe(false);
  });
});
