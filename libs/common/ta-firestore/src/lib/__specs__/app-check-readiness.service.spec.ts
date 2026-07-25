import { TestBed } from '@angular/core/testing';
import { AppCheckReadinessService } from '../app-check-readiness.service';

describe(AppCheckReadinessService.name, () => {
  let service: AppCheckReadinessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppCheckReadinessService);
  });

  it('should start pending and not blocked', () => {
    expect(service.status()).toBe('pending');
    expect(service.isBlocked()).toBe(false);
    expect(service.isRetrying()).toBe(false);
  });

  it('should mark ready', () => {
    service.markReady();

    expect(service.status()).toBe('ready');
    expect(service.isBlocked()).toBe(false);
  });

  it('should mark blocked', () => {
    service.markBlocked();

    expect(service.status()).toBe('blocked');
    expect(service.isBlocked()).toBe(true);
  });

  it('should run the registered retry handler and toggle the retrying flag', async () => {
    const states: boolean[] = [];
    service.registerRetryHandler(async () => {
      states.push(service.isRetrying());
    });

    expect(service.isRetrying()).toBe(false);
    await service.retry();

    expect(states).toEqual([true]);
    expect(service.isRetrying()).toBe(false);
  });

  it('should ignore retry when no handler is registered', async () => {
    await expect(service.retry()).resolves.toBeUndefined();
    expect(service.isRetrying()).toBe(false);
  });

  it('should not run a second retry while one is in progress', async () => {
    let calls = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    service.registerRetryHandler(async () => {
      calls += 1;
      await gate;
    });

    const first = service.retry();
    // Second call while the first is still pending must be a no-op.
    await service.retry();
    expect(calls).toBe(1);
    expect(service.isRetrying()).toBe(true);

    release();
    await first;

    expect(calls).toBe(1);
    expect(service.isRetrying()).toBe(false);
  });

  it('should reset the retrying flag when the handler throws', async () => {
    service.registerRetryHandler(async () => {
      throw new Error('boom');
    });

    await expect(service.retry()).rejects.toThrow('boom');
    expect(service.isRetrying()).toBe(false);
  });
});
