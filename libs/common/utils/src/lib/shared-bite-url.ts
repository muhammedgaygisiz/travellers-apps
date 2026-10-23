import { BITE_TRIBE_ORIGIN } from './bite-tribe-origin';

/**
 * The address a shared Bite is sent as (GitHub issue #345).
 *
 * Built from {@link BITE_TRIBE_ORIGIN} rather than spelled out, so a share
 * names the canonical host decided in issue #1454 - the same one the table QR
 * codes are printed with. Shares sent before that change point at
 * `bite-tribe.web.app` and keep working: that host serves the same build, is
 * still handled by `handleSharedLinkToBite`, and is still a verified App Link
 * on both platforms.
 *
 * The link share and the QR code on a share image both use this, so the two
 * can never point at different places. Only the Bite's id goes into it - no
 * text a user wrote - which is what keeps the QR code from being turned into a
 * phishing link (`UC-SBS` `R-23`).
 */
export const sharedBiteUrl = (biteId: string): string =>
  `${BITE_TRIBE_ORIGIN}/s/bite/${encodeURIComponent(biteId)}`;
