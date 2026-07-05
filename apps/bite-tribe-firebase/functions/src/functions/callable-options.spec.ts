import { onCall } from 'firebase-functions/https';

import { getAppCheckCallableOptions, onAppCheck } from './callable-options';

jest.mock('firebase-functions/https', () => ({
  onCall: jest.fn((_options, handler) => ({ handler })),
}));

describe('callable-options', () => {
  afterEach(() => {
    delete process.env['FUNCTIONS_EMULATOR'];
    jest.clearAllMocks();
  });

  it('enforces App Check outside the Functions emulator', () => {
    expect(getAppCheckCallableOptions()).toEqual({
      enforceAppCheck: true,
    });
  });

  it('disables App Check enforcement in the Functions emulator', () => {
    process.env['FUNCTIONS_EMULATOR'] = 'true';

    expect(getAppCheckCallableOptions()).toEqual({
      enforceAppCheck: false,
    });
  });

  it('uses the emulator-aware App Check options for callables', () => {
    process.env['FUNCTIONS_EMULATOR'] = 'true';
    const handler = jest.fn();

    onAppCheck(handler);

    expect(jest.mocked(onCall)).toHaveBeenCalledWith(
      {
        enforceAppCheck: false,
      },
      handler,
    );
  });
});
