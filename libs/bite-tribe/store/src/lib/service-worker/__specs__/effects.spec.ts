import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { rootEffectsInit } from '@ngrx/effects';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { AlertController, Platform } from '@ionic/angular/standalone';
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
 * A background tab cannot click "Restart Now", so a ready update there must
 * apply itself rather than leave the tab on an old build for days. See GitHub
 * issue #1904.
 */
describe(ServiceWorkerEffects.name, () => {
  let versionUpdates: Subject<VersionEvent>;
  let subscription: Subscription;
  let visibility: Visibility;
  let visibilityListeners: Array<() => void>;
  let dismissAlert: () => void;

  const swUpdate = {
    versionUpdates: new Subject<VersionEvent>(),
    activateUpdate: jest.fn(),
  };
  const reload = jest.fn();
  const alert = {
    present: jest.fn(),
    dismiss: jest.fn(),
    onDidDismiss: jest.fn(),
  };
  const alertController = { create: jest.fn() };
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
    alert.present.mockResolvedValue(undefined);
    alert.onDidDismiss.mockReturnValue(
      new Promise<void>((resolve) => (dismissAlert = resolve)),
    );
    alertController.create.mockResolvedValue(alert);

    TestBed.configureTestingModule({
      providers: [
        ServiceWorkerEffects,
        provideMockActions(() => of(rootEffectsInit())),
        { provide: SwUpdate, useValue: swUpdate },
        { provide: AlertController, useValue: alertController },
        { provide: Platform, useValue: platform },
        { provide: DOCUMENT, useValue: fakeDocument },
      ],
    });
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

    it('does not wait behind the dialog', () => {
      expect(alertController.create).not.toHaveBeenCalled();
    });
  });

  it('still reloads when activating the update fails', async () => {
    swUpdate.activateUpdate.mockRejectedValue(new Error('boom'));
    visibility = 'hidden';

    versionUpdates.next(versionReady);
    await flush();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  describe('VERSION_READY in a visible tab', () => {
    beforeEach(async () => {
      versionUpdates.next(versionReady);
      await flush();
    });

    it('shows the dialog and does not reload by itself', () => {
      expect(alertController.create).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'App Update Ready' }),
      );
      expect(alert.present).toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
    });

    it('reloads once when Restart Now is clicked', async () => {
      const [{ buttons }] = alertController.create.mock.calls[0];
      buttons[0].handler();
      buttons[0].handler();
      await flush();

      expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('applies the update when the member leaves the tab with the dialog up', async () => {
      goHidden();
      await flush();

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('stops watching the tab once the dialog is gone', async () => {
      dismissAlert();
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
    expect(alertController.create).not.toHaveBeenCalled();
  });
});
