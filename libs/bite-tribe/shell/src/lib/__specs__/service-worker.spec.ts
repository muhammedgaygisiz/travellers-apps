import { isDevMode } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  disableServiceWorkerOnNative,
  isServiceWorkerEnabled,
} from '../service-worker';

jest.mock('@capacitor/core');
jest.mock('@angular/core', () => ({
  ...jest.requireActual('@angular/core'),
  isDevMode: jest.fn(),
}));

const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;
const devMode = isDevMode as jest.Mock;

const setServiceWorkerContainer = (
  container: Partial<ServiceWorkerContainer> | undefined,
): void => {
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
};

const setCacheStorage = (cacheStorage: Partial<CacheStorage>): void => {
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: cacheStorage,
  });
};

describe(isServiceWorkerEnabled.name, () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('given a web platform', () => {
    beforeEach(() => {
      isNativePlatform.mockReturnValue(false);
    });

    it('should enable the service worker outside dev mode', () => {
      devMode.mockReturnValue(false);

      expect(isServiceWorkerEnabled()).toBe(true);
    });

    it('should disable the service worker in dev mode', () => {
      devMode.mockReturnValue(true);

      expect(isServiceWorkerEnabled()).toBe(false);
    });
  });

  describe('given a native platform', () => {
    beforeEach(() => {
      isNativePlatform.mockReturnValue(true);
    });

    it('should disable the service worker outside dev mode', () => {
      devMode.mockReturnValue(false);

      expect(isServiceWorkerEnabled()).toBe(false);
    });
  });
});

describe(disableServiceWorkerOnNative.name, () => {
  let unregister: jest.Mock;
  let getRegistrations: jest.Mock;
  let keys: jest.Mock;
  let deleteCache: jest.Mock;

  beforeEach(() => {
    unregister = jest.fn().mockResolvedValue(true);
    getRegistrations = jest.fn().mockResolvedValue([{ unregister }]);
    keys = jest
      .fn()
      .mockResolvedValue(['ngsw:/:db:control', 'ngsw:/:1:assets', 'other']);
    deleteCache = jest.fn().mockResolvedValue(true);

    setCacheStorage({ keys, delete: deleteCache });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis.navigator, 'serviceWorker');
    Reflect.deleteProperty(globalThis, 'caches');
    jest.clearAllMocks();
  });

  describe('given a web platform', () => {
    beforeEach(() => {
      isNativePlatform.mockReturnValue(false);
      setServiceWorkerContainer({ getRegistrations, controller: null });
    });

    it('should keep the registered service worker', async () => {
      await disableServiceWorkerOnNative();

      expect(getRegistrations).not.toHaveBeenCalled();
      expect(unregister).not.toHaveBeenCalled();
      expect(deleteCache).not.toHaveBeenCalled();
    });
  });

  describe('given a native platform', () => {
    beforeEach(() => {
      isNativePlatform.mockReturnValue(true);
    });

    describe('and the document is still controlled by a worker', () => {
      beforeEach(() => {
        setServiceWorkerContainer({
          getRegistrations,
          controller: {} as ServiceWorker,
        });
      });

      it('should unregister the worker but keep its caches', async () => {
        await disableServiceWorkerOnNative();

        expect(unregister).toHaveBeenCalledTimes(1);
        expect(deleteCache).not.toHaveBeenCalled();
      });
    });

    describe('and no worker controls the document', () => {
      beforeEach(() => {
        setServiceWorkerContainer({ getRegistrations, controller: null });
      });

      it('should unregister every registration', async () => {
        getRegistrations.mockResolvedValue([
          { unregister },
          { unregister: jest.fn().mockResolvedValue(true) },
        ]);

        await disableServiceWorkerOnNative();

        expect(getRegistrations).toHaveBeenCalledTimes(1);
        expect(unregister).toHaveBeenCalledTimes(1);
      });

      it('should delete the service worker caches only', async () => {
        await disableServiceWorkerOnNative();

        expect(deleteCache).toHaveBeenCalledTimes(2);
        expect(deleteCache).toHaveBeenCalledWith('ngsw:/:db:control');
        expect(deleteCache).toHaveBeenCalledWith('ngsw:/:1:assets');
        expect(deleteCache).not.toHaveBeenCalledWith('other');
      });

      it('should not fail when the cache storage is unavailable', async () => {
        Reflect.deleteProperty(globalThis, 'caches');

        await expect(disableServiceWorkerOnNative()).resolves.toBeUndefined();
      });
    });

    describe('and the WebView exposes no service worker container', () => {
      beforeEach(() => {
        setServiceWorkerContainer(undefined);
      });

      it('should resolve without touching the caches', async () => {
        await expect(disableServiceWorkerOnNative()).resolves.toBeUndefined();

        expect(deleteCache).not.toHaveBeenCalled();
      });
    });

    describe('and the cleanup fails', () => {
      beforeEach(() => {
        getRegistrations.mockRejectedValue(new Error('not allowed'));
        setServiceWorkerContainer({ getRegistrations, controller: null });
      });

      it('should warn instead of breaking startup', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation();

        await expect(disableServiceWorkerOnNative()).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalled();

        warn.mockRestore();
      });
    });
  });
});
