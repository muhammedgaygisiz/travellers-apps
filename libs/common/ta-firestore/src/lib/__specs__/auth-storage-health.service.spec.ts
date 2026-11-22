import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import {
  AUTH_STORAGE_PROBE_TIMEOUT_MS,
  AuthStorageHealthService,
  FIREBASE_AUTH_DB_NAME,
  probeAuthStorage,
} from '../auth-storage-health.service';

/**
 * An `IDBFactory` whose one open request the test answers by hand, so each of
 * the ways a browser can answer - or not answer - is a line in a test.
 */
class FakeOpenRequest {
  onupgradeneeded: (() => void) | null = null;
  onsuccess: (() => void) | null = null;
  onerror: ((event: { preventDefault: () => void }) => void) | null = null;
  readonly transaction = { abort: jest.fn() };
  readonly result = { close: jest.fn() };
}

const fakeIdb = (): {
  idb: IDBFactory;
  open: jest.Mock;
  request: FakeOpenRequest;
} => {
  const request = new FakeOpenRequest();
  const open = jest.fn(() => request);

  return { idb: { open } as unknown as IDBFactory, open, request };
};

describe('probeAuthStorage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should open Firebase Auth's database without asking for a version", () => {
    const { idb, open } = fakeIdb();

    void probeAuthStorage(idb);

    expect(open).toHaveBeenCalledWith(FIREBASE_AUTH_DB_NAME);
  });

  it('should answer responsive and close the connection when the open succeeds', async () => {
    const { idb, request } = fakeIdb();
    const result = probeAuthStorage(idb);

    request.onsuccess?.();

    await expect(result).resolves.toBe('responsive');
    expect(request.result.close).toHaveBeenCalled();
  });

  it('should abort rather than create a database that does not exist yet', async () => {
    const { idb, request } = fakeIdb();
    const preventDefault = jest.fn();
    const result = probeAuthStorage(idb);

    request.onupgradeneeded?.();
    request.onerror?.({ preventDefault });

    expect(request.transaction.abort).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
    await expect(result).resolves.toBe('responsive');
  });

  it('should answer stuck when the open never comes back', async () => {
    const { idb } = fakeIdb();
    const result = probeAuthStorage(idb);

    jest.advanceTimersByTime(AUTH_STORAGE_PROBE_TIMEOUT_MS);

    await expect(result).resolves.toBe('stuck');
  });

  it('should still close a connection that arrives after it gave up', async () => {
    const { idb, request } = fakeIdb();
    const result = probeAuthStorage(idb);

    jest.advanceTimersByTime(AUTH_STORAGE_PROBE_TIMEOUT_MS);
    request.onsuccess?.();

    await expect(result).resolves.toBe('stuck');
    expect(request.result.close).toHaveBeenCalled();
  });

  it('should answer unavailable without IndexedDB', async () => {
    await expect(probeAuthStorage(undefined)).resolves.toBe('unavailable');
  });

  it('should answer unavailable when opening throws', async () => {
    const idb = {
      open: () => {
        throw new Error('SecurityError');
      },
    } as unknown as IDBFactory;

    await expect(probeAuthStorage(idb)).resolves.toBe('unavailable');
  });
});

describe(AuthStorageHealthService.name, () => {
  let service: AuthStorageHealthService;

  beforeEach(() => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthStorageHealthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start out not stuck', () => {
    expect(service.isStuck()).toBe(false);
  });

  it('should raise isStuck when the storage does not answer', async () => {
    await service.check(() => Promise.resolve('stuck'));

    expect(service.isStuck()).toBe(true);
  });

  it.each(['responsive', 'unavailable'] as const)(
    'should stay clear when the storage is %s',
    async (result) => {
      await service.check(() => Promise.resolve(result));

      expect(service.isStuck()).toBe(false);
    },
  );

  it('should share one probe between concurrent checks', async () => {
    const probe = jest.fn(() => Promise.resolve('stuck' as const));

    await Promise.all([service.check(probe), service.check(probe)]);

    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('should probe again once the previous check has finished', async () => {
    const probe = jest.fn(() => Promise.resolve('responsive' as const));

    await service.check(probe);
    await service.check(probe);

    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('should lift the gate when Auth answers after all', async () => {
    await service.check(() => Promise.resolve('stuck'));

    service.markResponsive();

    expect(service.isStuck()).toBe(false);
  });

  it('should not probe on a native platform', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const probe = jest.fn(() => Promise.resolve('stuck' as const));

    await expect(service.check(probe)).resolves.toBe('responsive');
    expect(probe).not.toHaveBeenCalled();
    expect(service.isStuck()).toBe(false);
  });
});
