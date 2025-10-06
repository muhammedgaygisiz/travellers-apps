import { provideFirestoreAnalytics } from '../provide-firestore-analytics';
import { getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

jest.mock('firebase/app', () => {
  return {
    getApp: jest.fn(),
  };
});

jest.mock('firebase/analytics', () => {
  return {
    getAnalytics: jest.fn(),
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
      (getApp as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = factory();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Firebase Analytics is not supported in this environment.'
      );

      consoleWarnSpy.mockRestore();
      (getApp as jest.Mock).mockReset();

      expect(result).toBeNull();
    });
  });
});
