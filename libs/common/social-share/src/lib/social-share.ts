import { registerPlugin } from '@capacitor/core';

/**
 * The apps a share image can be handed to directly (issue #1730).
 *
 * One per entry of the share menu that opens an app: the two Stories editors
 * and Instagram's feed composer. `UC-SBS` lists them, and rules out every other
 * app for now.
 */
export type SocialShareTarget =
  'instagram-story' | 'instagram-post' | 'facebook-story';

/** An image the composer wrote to the cache, named by its file URI. */
export interface SocialShareFile {
  path: string;
}

/**
 * Native hand-off of a share image to Instagram and Facebook (`UC-SBS`
 * `R-25` to `R-28`).
 *
 * `@capacitor/share` only opens the system share sheet. It cannot write to the
 * Stories pasteboard on iOS or send the targeted intents on Android, which is
 * what lands the user in the Stories editor or the feed composer with the image
 * already loaded.
 *
 * The implementation is part of each wrapper rather than an npm plugin:
 * `SocialSharePlugin.swift` in `apps/bite-tribe-ios` and
 * `SocialSharePlugin.java` in `apps/bite-tribe-android`. Both read Meta's
 * public App ID from the wrapper's own configuration - never the App Secret or
 * the client token, and no Meta SDK. The web build has no implementation, so
 * every method rejects there; callers check the platform first.
 *
 * A hand-off resolves once the target app was asked to open, which is all
 * either OS reports. Nothing tells BiteTribe whether the user posted.
 */
export interface SocialSharePlugin {
  /** Whether the target's app is installed, so its menu entry can be shown. */
  canShareTo(options: {
    target: SocialShareTarget;
  }): Promise<{ available: boolean }>;

  /** Opens the Instagram Stories editor with the image as its background. */
  shareToInstagramStory(file: SocialShareFile): Promise<void>;

  /** Opens the Facebook Stories editor with the image as its background. */
  shareToFacebookStory(file: SocialShareFile): Promise<void>;

  /**
   * Opens Instagram's feed composer with the image. iOS saves it to the photo
   * library first, asking for add-only access; Android sends it directly.
   */
  shareToInstagramFeed(file: SocialShareFile): Promise<void>;
}

/**
 * The code a hand-off rejects with when the user refused to let BiteTribe add
 * the image to their photos, which only the iOS feed hand-off asks for. The
 * same code `SaveImage` uses.
 */
export const SOCIAL_SHARE_PERMISSION_DENIED = 'permission-denied';

/**
 * The code a hand-off rejects with when the target app is not installed or the
 * OS would not open it.
 */
export const SOCIAL_SHARE_UNAVAILABLE = 'unavailable';

export const SocialShare = registerPlugin<SocialSharePlugin>('SocialShare');
