/**
 * The public origin BiteTribe is served from.
 *
 * One constant rather than one per consumer, because the two things that use
 * it have to agree and one of them is printed onto physical objects. The
 * consumer shell canonicalises search-engine URLs against it (issue \#1454),
 * and the business app encodes it into every table QR code it prints (issue
 * \#1087) - a sticker already glued to a table cannot be corrected, so a second
 * copy of this string that drifted would silently retire a room full of codes.
 *
 * `www.bitetribe.app` and `bite-tribe.web.app` serve the same build. This is
 * the host of the three that both surfaces name.
 */
export const BITE_TRIBE_ORIGIN = 'https://bitetribe.app';

/** A plain `https://host`, nothing after it. */
const PLAIN_HTTPS_ORIGIN = /^https:\/\/[a-z0-9.-]+$/;

/**
 * The origin of the links this build hands out to be opened elsewhere: menu
 * codes, table codes and shared Bites (GitHub issue #2304).
 *
 * {@link BITE_TRIBE_ORIGIN} in production. A QA build sets
 * `NX_APP_BITE_TRIBE_LINK_ORIGIN` (in `backends/qa.web.json`) to the QA site,
 * so a code printed or a link shared on QA opens QA rather than production,
 * where the QA restaurant does not exist. Canonical URLs stay on
 * {@link BITE_TRIBE_ORIGIN} everywhere, so search engines never index QA.
 *
 * Production first: anything but a plain `https://host` - unset, empty, a
 * typo - is the production origin. The read is guarded because only an app
 * build inlines `process.env`; Storybook has no `process` at all.
 */
export const linkOrigin = (): string => {
  let configured: string | undefined;

  try {
    configured = process.env['NX_APP_BITE_TRIBE_LINK_ORIGIN'];
  } catch {
    configured = undefined;
  }

  return configured && PLAIN_HTTPS_ORIGIN.test(configured)
    ? configured
    : BITE_TRIBE_ORIGIN;
};
