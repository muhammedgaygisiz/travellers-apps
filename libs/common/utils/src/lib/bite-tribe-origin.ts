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
