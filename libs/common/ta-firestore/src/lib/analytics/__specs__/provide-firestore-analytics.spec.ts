import { describe, expect, it } from 'vitest';
import { provideFirestoreAnalytics } from '../provide-firestore-analytics';
import { getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { vi, Mock } from 'vitest';

vi.mock('firebase/app', () => {
  return {
    getApp: vi.fn(),
  };
});

vi.mock('firebase/analytics', () => {
  return {
    getAnalytics: vi.fn(),
  };
});

describe('provideFirestoreAnalytics', () => {
  const providers = provideFirestoreAnalytics();

  it('should provide FIREBASE_ANALYTICS and ErrorHandler', () => {
    expect(providers).toMatchSnapshot();
  });

  describe('FIREBASE_ANALYTICS factory', () => {
    const factory = (providers[0] as any).useFactory;

    it('should call getApp and getAnalytics', () => {
      factory();

      expect(getApp).toHaveBeenCalled();
      expect(getAnalytics).toHaveBeenCalled();
    });

    it('should log warning if error happens and return null', () => {
      (getApp as Mock).mockImplementation(() => {
        throw new Error('Test error');
      });
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});

      const result = factory();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Firebase Analytics is not supported in this environment.',
      );

      consoleWarnSpy.mockRestore();
      (getApp as Mock).mockReset();

      expect(result).toBeNull();
    });
  });
});
