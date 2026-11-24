import { BITE_TRIBE_ORIGIN, linkOrigin } from '../bite-tribe-origin';
import { sharedBiteUrl } from '../shared-bite-url';

/** See GitHub issue #2304. */
describe('linkOrigin', () => {
  const KEY = 'NX_APP_BITE_TRIBE_LINK_ORIGIN';
  const saved = process.env[KEY];

  const withOrigin = (value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[KEY];
    } else {
      process.env[KEY] = value;
    }
  };

  afterEach(() => withOrigin(saved));

  it('is the production origin when nothing sets it, as in production', () => {
    withOrigin(undefined);

    expect(linkOrigin()).toBe(BITE_TRIBE_ORIGIN);
    expect(sharedBiteUrl('b-1')).toBe('https://bitetribe.app/s/bite/b-1');
  });

  it('is the QA site in a QA build', () => {
    withOrigin('https://bite-tribe-qa.web.app');

    expect(linkOrigin()).toBe('https://bite-tribe-qa.web.app');
    expect(sharedBiteUrl('b-1')).toBe(
      'https://bite-tribe-qa.web.app/s/bite/b-1',
    );
  });

  it.each(['', 'http://bite-tribe-qa.web.app', 'https://qa.example/x', 'qa'])(
    'falls back to production for anything but a plain https origin: %j',
    (value) => {
      withOrigin(value);

      expect(linkOrigin()).toBe(BITE_TRIBE_ORIGIN);
    },
  );
});
