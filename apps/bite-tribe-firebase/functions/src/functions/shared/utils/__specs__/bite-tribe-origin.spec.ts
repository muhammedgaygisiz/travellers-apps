import { BITE_TRIBE_ORIGIN, linkOrigin, QA_ORIGIN } from '../bite-tribe-origin';

/** See GitHub issue #2304. */
describe('linkOrigin', () => {
  it('names the QA site in the QA project', () => {
    expect(linkOrigin('qa')).toBe(QA_ORIGIN);
  });

  it('names bitetribe.app in production and on the emulators', () => {
    expect(linkOrigin('production')).toBe(BITE_TRIBE_ORIGIN);
    expect(linkOrigin('dev')).toBe(BITE_TRIBE_ORIGIN);
  });

  it('reads the stage from the project it runs in', () => {
    const saved = process.env['GCLOUD_PROJECT'];

    try {
      process.env['GCLOUD_PROJECT'] = 'bite-tribe-qa';
      expect(linkOrigin()).toBe(QA_ORIGIN);

      process.env['GCLOUD_PROJECT'] = 'bite-tribe';
      expect(linkOrigin()).toBe(BITE_TRIBE_ORIGIN);
    } finally {
      if (saved === undefined) {
        delete process.env['GCLOUD_PROJECT'];
      } else {
        process.env['GCLOUD_PROJECT'] = saved;
      }
    }
  });
});
