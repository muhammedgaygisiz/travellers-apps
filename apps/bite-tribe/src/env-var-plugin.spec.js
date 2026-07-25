const {
  collectPublicEnv,
  FIREBASE_ENV_KEYS,
  DEV_ONLY_ENV_KEYS,
} = require('../../../tools/env-var-plugin');

describe(collectPublicEnv.name, () => {
  const collect = (overrides) =>
    collectPublicEnv({
      allowedKeys: ['NX_APP_BITE_TRIBE_API_KEY'],
      devOnlyKeys: DEV_ONLY_ENV_KEYS,
      env: {},
      isProduction: true,
      ...overrides,
    });

  it('inlines allowlisted keys that are set', () => {
    expect(collect({ env: { NX_APP_BITE_TRIBE_API_KEY: 'api-key' } })).toEqual({
      NX_APP_BITE_TRIBE_API_KEY: 'api-key',
    });
  });

  it('omits allowlisted keys that are not set', () => {
    expect(collect({ env: {} })).toEqual({});
  });

  it('never inlines Nx internals such as the build machine path', () => {
    const publicEnv = collect({
      env: {
        NX_APP_BITE_TRIBE_API_KEY: 'api-key',
        NX_WORKSPACE_ROOT: '/Users/someone/DEV/travellers-apps',
        NX_TASK_HASH: '14096746580211753729',
        NX_INVOCATION_ROOT_PID: '2750',
      },
    });

    expect(publicEnv).toEqual({ NX_APP_BITE_TRIBE_API_KEY: 'api-key' });
  });

  it('never inlines an unknown NX_ variable that is set at build time', () => {
    const publicEnv = collect({
      env: { NX_APP_SOME_FUTURE_SERVICE_SECRET: 'super-secret' },
    });

    expect(publicEnv).toEqual({});
  });

  it('strips dev-only keys from a production build', () => {
    const publicEnv = collect({
      allowedKeys: FIREBASE_ENV_KEYS,
      env: {
        NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN: 'debug-token',
        NX_APP_BITE_TRIBE_IS_DEV: 'true',
        NX_APP_BITE_TRIBE_PROJECT_ID: 'bite-tribe',
      },
      isProduction: true,
    });

    expect(publicEnv).toEqual({ NX_APP_BITE_TRIBE_PROJECT_ID: 'bite-tribe' });
  });

  it('keeps dev-only keys outside a production build', () => {
    const publicEnv = collect({
      allowedKeys: FIREBASE_ENV_KEYS,
      env: {
        NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN: 'debug-token',
        NX_APP_BITE_TRIBE_IS_DEV: 'true',
      },
      isProduction: false,
    });

    expect(publicEnv).toEqual({
      NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN: 'debug-token',
      NX_APP_BITE_TRIBE_IS_DEV: 'true',
    });
  });

  it('adds static values that are compiled into the bundle', () => {
    const publicEnv = collect({
      env: {},
      staticValues: { NX_APP_BITE_TRIBE_IS_BUSINESS: 'true' },
    });

    expect(publicEnv).toEqual({ NX_APP_BITE_TRIBE_IS_BUSINESS: 'true' });
  });

  it('marks the App Check debug token dev-only so production cannot inline it', () => {
    expect(FIREBASE_ENV_KEYS).toContain(
      'NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN',
    );
    expect(DEV_ONLY_ENV_KEYS).toContain(
      'NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN',
    );
  });
});
