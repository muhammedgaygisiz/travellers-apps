import { TestBed } from '@angular/core/testing';
import {
  APP_CHECK_RECOVERY_DELAYS_MS,
  AppCheckReadinessService,
} from '../app-check-readiness.service';

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

  it('should keep the gate up in the terminal state', () => {
    service.markUnavailable();

    expect(service.status()).toBe('unavailable');
    expect(service.isBlocked()).toBe(true);
  });

  // Issue #1621: a page that started with an App Check token and lost it
  // afterwards. Everything below is the way back that page did not have.
  describe('mid-session recovery', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /**
     * Lets the recovery walk its whole backoff. Each attempt is a timer
     * followed by an awaited handler, so the queued microtasks have to drain
     * between timers or the next one is not scheduled yet.
     */
    const runRecovery = async (): Promise<void> => {
      for (const delayMs of APP_CHECK_RECOVERY_DELAYS_MS) {
        jest.advanceTimersByTime(delayMs);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      }
    };

    it('should block the shell and recover when a token comes back', async () => {
      service.markReady();
      service.registerRetryHandler(async () => service.markReady());

      const recovery = service.reportTokenLost();
      expect(service.status()).toBe('blocked');
      expect(service.isBlocked()).toBe(true);

      await runRecovery();
      await recovery;

      expect(service.status()).toBe('ready');
      expect(service.isBlocked()).toBe(false);
    });

    it('should tell the retry handler that a token was proven missing', async () => {
      const contexts: { requireToken: boolean }[] = [];
      service.markReady();
      service.registerRetryHandler(async (context) => {
        contexts.push(context);
        service.markReady();
      });

      const recovery = service.reportTokenLost();
      await runRecovery();
      await recovery;

      expect(contexts).toEqual([{ requireToken: true }]);
    });

    it('should end in the terminal state when the attempts run out', async () => {
      let attempts = 0;
      service.markReady();
      service.registerRetryHandler(async () => {
        attempts += 1;
      });

      const recovery = service.reportTokenLost();
      await runRecovery();
      await recovery;

      expect(attempts).toBe(APP_CHECK_RECOVERY_DELAYS_MS.length);
      expect(service.status()).toBe('unavailable');
      expect(service.isBlocked()).toBe(true);
    });

    // The SDK's own auto-refresh works the same problem in parallel, and the
    // handler is what marks the app ready when it wins.
    it('should stop asking once the app is ready again', async () => {
      let attempts = 0;
      service.markReady();
      service.registerRetryHandler(async () => {
        attempts += 1;
        service.markReady();
      });

      const recovery = service.reportTokenLost();
      await runRecovery();
      await recovery;

      expect(attempts).toBe(1);
    });

    it('should not start a second recovery while one is running', async () => {
      let attempts = 0;
      service.markReady();
      service.registerRetryHandler(async () => {
        attempts += 1;
      });

      const recovery = service.reportTokenLost();
      await service.reportTokenLost();
      await runRecovery();
      await recovery;

      expect(attempts).toBe(APP_CHECK_RECOVERY_DELAYS_MS.length);
    });

    // A startup that never proved readiness is the gate's own business, and it
    // is blocked already.
    it('should leave a startup that never became ready alone', async () => {
      const handler = jest.fn();
      service.registerRetryHandler(handler);
      service.markBlocked();

      await service.reportTokenLost();

      expect(handler).not.toHaveBeenCalled();
      expect(service.status()).toBe('blocked');
    });
  });
});
