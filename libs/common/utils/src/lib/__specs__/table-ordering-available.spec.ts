import { TestBed } from '@angular/core/testing';
import { TABLE_ORDERING_AVAILABLE } from '../app-tokens';

/** See GitHub issue #2307. */
describe('TABLE_ORDERING_AVAILABLE', () => {
  const KEYS = [
    'NX_APP_BITE_TRIBE_TABLE_ORDERING_ENABLED',
    'NX_APP_BITE_TRIBE_IS_DEV',
  ];
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

  const read = (env: Record<string, string | undefined>): boolean => {
    KEYS.forEach((key) => {
      if (env[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = env[key];
      }
    });
    TestBed.resetTestingModule();

    return TestBed.inject(TABLE_ORDERING_AVAILABLE);
  };

  afterEach(() =>
    KEYS.forEach((key) => {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }),
  );

  it('is off when nothing says otherwise, as in a production build', () => {
    expect(read({})).toBe(false);
  });

  it('is on when the build turns it on, as QA does', () => {
    expect(read({ NX_APP_BITE_TRIBE_TABLE_ORDERING_ENABLED: 'true' })).toBe(
      true,
    );
  });

  it('is on against the emulators', () => {
    expect(read({ NX_APP_BITE_TRIBE_IS_DEV: 'true' })).toBe(true);
  });

  it('is off for any value but "true"', () => {
    expect(read({ NX_APP_BITE_TRIBE_TABLE_ORDERING_ENABLED: 'false' })).toBe(
      false,
    );
  });
});
