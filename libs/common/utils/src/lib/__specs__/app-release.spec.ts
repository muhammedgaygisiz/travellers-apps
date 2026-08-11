import { App } from '@capacitor/app';
import {
  appRelease,
  loadAppRelease,
  resetAppReleaseForTesting,
} from '../app-release';

jest.mock('@capacitor/app', () => ({
  App: { getInfo: jest.fn() },
}));

const getInfo = App.getInfo as jest.Mock;

describe('appRelease', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAppReleaseForTesting();
  });

  it('starts from the build-time values, which are empty outside a build', () => {
    expect(appRelease()).toEqual({ version: '', buildNumber: '' });
  });

  it('reports what the native bundle says it is', async () => {
    getInfo.mockResolvedValue({ version: '1.0.1', build: '93' });

    await expect(loadAppRelease()).resolves.toEqual({
      version: '1.0.1',
      buildNumber: '93',
    });
    expect(appRelease()).toEqual({ version: '1.0.1', buildNumber: '93' });
  });

  it('keeps the build-time values where there is no native app info', async () => {
    getInfo.mockRejectedValue(new Error('not native'));

    await expect(loadAppRelease()).resolves.toEqual({
      version: '',
      buildNumber: '',
    });
  });

  it('keeps the build-time values when the native version is empty', async () => {
    // A version-less `getInfo` result would otherwise replace a correct
    // build-time version with nothing at all.
    getInfo.mockResolvedValue({ version: '', build: '93' });

    await expect(loadAppRelease()).resolves.toEqual({
      version: '',
      buildNumber: '',
    });
  });

  it('reports a native version that declares no build number', async () => {
    getInfo.mockResolvedValue({ version: '1.0.1' });

    await expect(loadAppRelease()).resolves.toEqual({
      version: '1.0.1',
      buildNumber: '',
    });
  });

  it('asks the native bundle once, however many callers want the answer', async () => {
    getInfo.mockResolvedValue({ version: '1.0.1', build: '93' });

    await Promise.all([loadAppRelease(), loadAppRelease()]);
    await loadAppRelease();

    expect(getInfo).toHaveBeenCalledTimes(1);
  });
});
