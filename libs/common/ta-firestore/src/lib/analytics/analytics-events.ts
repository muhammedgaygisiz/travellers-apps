/**
 * Launch-critical product analytics events.
 *
 * These formalize the product event taxonomy referenced by the SSOT
 * (`Architecture - Analytics`, `Implementation - Analytics Events`) so activation,
 * creation, and discovery can be measured for launch. Screen, user-id, and
 * exception tracking are handled separately (see `provide-firestore-analytics`
 * and `firebase-error-handler.service`).
 *
 * Names use the GA4 snake_case convention.
 *
 * The taxonomy spans two apps. Every event declares the app it belongs to in
 * {@link ANALYTICS_EVENT_SURFACE}, and `AnalyticsService` drops an event whose
 * surface is not the bundle it is running in - which is what keeps the consumer
 * taxonomy out of the business app and the table operations of issue #1098 out
 * of the consumer one.
 */
export const AnalyticsEvent = {
  // Activation
  SignUp: 'sign_up',
  PasswordResetRequested: 'password_reset_requested',
  PasswordResetRequestFailed: 'password_reset_request_failed',
  EmailVerificationPromptShown: 'email_verification_prompt_shown',
  EmailVerificationResendTapped: 'email_verification_resend_tapped',
  EmailVerificationResendSucceeded: 'email_verification_resend_succeeded',
  EmailVerificationResendFailed: 'email_verification_resend_failed',
  EmailVerificationSynced: 'email_verification_synced',
  // Account lifecycle
  AccountDeletionStarted: 'account_deletion_started',
  AccountDeletionCompleted: 'account_deletion_completed',
  AccountDeletionFailed: 'account_deletion_failed',
  // Creation
  BiteCreated: 'bite_created',
  BiteImageUploaded: 'bite_image_uploaded',
  BiteImageUploadFailed: 'bite_image_upload_failed',
  BiteImageUploadRetried: 'bite_image_upload_retried',
  BucketListCreated: 'bucketlist_created',
  BucketListRated: 'bucketlist_rated',
  // Discovery
  SearchPerformed: 'search_performed',
  RestaurantViewed: 'restaurant_viewed',
  BiteViewed: 'bite_viewed',
  // Onboarding funnel (epic #850)
  OnboardingAssistantStarted: 'onboarding_assistant_started',
  OnboardingStepCompleted: 'onboarding_step_completed',
  OnboardingAssistantCompleted: 'onboarding_assistant_completed',
  CoachMarkDismissed: 'coach_mark_dismissed',
  // Follow suggestions (issue #1708)
  FollowSuggestionsShown: 'follow_suggestions_shown',
  FollowSuggestionFollowed: 'follow_suggestion_followed',
  UserFollowed: 'user_followed',
  // Table operations, business app (epic #1071, issue #1098)
  TableSeated: 'table_seated',
  TableFreed: 'table_freed',
  TableReserved: 'table_reserved',
  TableCleaningStarted: 'table_cleaning_started',
  TableDisabled: 'table_disabled',
  TableVisitOpened: 'table_visit_opened',
  TableVisitClosed: 'table_visit_closed',
  // Order-to-Bite funnel, consumer app (epic #1073, issue #1114)
  TableCodeScanned: 'table_code_scanned',
  TableSessionStarted: 'table_session_started',
  TableOrderSubmitted: 'table_order_submitted',
  TableBitePromptShown: 'table_bite_prompt_shown',
  TableBiteStarted: 'table_bite_started',
  // Share-as-image funnel, consumer app (epic #1723, issue #1733)
  ShareMenuOpened: 'share_menu_opened',
  ShareTargetChosen: 'share_target_chosen',
  ShareComposerOpened: 'share_composer_opened',
  ShareTemplateChosen: 'share_template_chosen',
  ShareHandoffSucceeded: 'share_handoff_succeeded',
  ShareHandoffFailed: 'share_handoff_failed',
  // The visited-countries globe, consumer app (issue #1787)
  WorldGlobeOpened: 'world_globe_open',
  WorldGlobeCountryTapped: 'world_globe_country_tap',
  WorldGlobeZoomed: 'world_globe_zoom',
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/**
 * Typed parameters per event. Use `never` for events that carry no parameters.
 * GA4 parameter values must be primitives (string, number, boolean).
 */
export interface AnalyticsEventParamMap {
  [AnalyticsEvent.SignUp]: { method: string };
  [AnalyticsEvent.PasswordResetRequested]: never;
  [AnalyticsEvent.PasswordResetRequestFailed]: { code: string };
  [AnalyticsEvent.EmailVerificationPromptShown]: {
    surface: 'home' | 'settings' | 'profile_edit';
  };
  [AnalyticsEvent.EmailVerificationResendTapped]: {
    surface: 'home' | 'settings' | 'profile_edit';
  };
  [AnalyticsEvent.EmailVerificationResendSucceeded]: {
    surface: 'home' | 'settings' | 'profile_edit';
  };
  [AnalyticsEvent.EmailVerificationResendFailed]: {
    surface: 'home' | 'settings' | 'profile_edit';
    reason:
      | 'rate_limited'
      | 'already_verified'
      | 'unsupported_provider'
      | 'send_failed'
      | 'unknown';
  };
  // Only logged while a verification is still outstanding, so `verified: true`
  // marks the session where the user completed it rather than repeating for
  // every verified user on every app start.
  [AnalyticsEvent.EmailVerificationSynced]: {
    verified: boolean;
    source: 'app_start' | 'app_resume';
  };
  [AnalyticsEvent.AccountDeletionStarted]: never;
  [AnalyticsEvent.AccountDeletionCompleted]: never;
  [AnalyticsEvent.AccountDeletionFailed]: {
    // `account_changed` is a refusal rather than a fault: the signed-in account
    // was no longer the one the user confirmed, so nothing was deleted.
    reason: 'reauth_required' | 'reauth_failed' | 'account_changed' | 'unknown';
  };
  /**
   * Where the Bite came from (GitHub issue #1114).
   *
   * The last step of the order-to-Bite funnel, and the reason it is a
   * parameter on the event that already exists rather than a second event for
   * the same moment: a published Bite is a published Bite, and the launch
   * dashboard's count of them must not change because the funnel wanted to
   * read one.
   *
   * `BiteSource` in `bite-tribe/bite` is the same union, inlined here for the
   * reason every other union on this page is - `scope:common` may not import
   * `scope:bite-tribe` - and compared against it as text by
   * `analytics-events.spec.ts`.
   */
  [AnalyticsEvent.BiteCreated]: { source: 'visit' | 'menu' | 'manual' };
  [AnalyticsEvent.BiteImageUploaded]: never;
  [AnalyticsEvent.BiteImageUploadFailed]: { code: string };
  [AnalyticsEvent.BiteImageUploadRetried]: never;
  [AnalyticsEvent.BucketListCreated]: never;
  [AnalyticsEvent.BucketListRated]: { rating: number };
  [AnalyticsEvent.SearchPerformed]: never;
  [AnalyticsEvent.RestaurantViewed]: { verified: boolean };
  [AnalyticsEvent.BiteViewed]: never;
  [AnalyticsEvent.OnboardingAssistantStarted]: never;
  // `step` mirrors `OnboardingStepId` from `bite-tribe/onboarding-data-access`.
  // The union is inlined so this launch-critical taxonomy stays in the common
  // analytics layer without depending on a feature library.
  [AnalyticsEvent.OnboardingStepCompleted]: {
    step:
      | 'identity'
      | 'visibility'
      | 'currency'
      | 'language'
      | 'location'
      | 'photos'
      | 'notifications'
      | 'finish';
  };
  [AnalyticsEvent.OnboardingAssistantCompleted]: never;
  // `surface` mirrors `CoachMarkSurface` from `bite-tribe/coach-mark`, inlined
  // for the same reason as the onboarding step union above.
  [AnalyticsEvent.CoachMarkDismissed]: {
    surface:
      | 'home-feed'
      | 'home-menu'
      | 'home-feed-controls'
      | 'create-bite'
      | 'bite-details'
      | 'bite-details-share'
      | 'bite-details-navigation'
      | 'bite-details-bucket-list'
      | 'map'
      | 'bucket-lists'
      | 'bucket-list-swipe'
      | 'leaderboard';
  };
  /**
   * Follow suggestions (GitHub issue #1708).
   *
   * `surface` and `reason` repeat `FollowSuggestionSurface` and
   * `FollowSuggestionReason` from `model`, inlined for the reason the
   * onboarding unions above are. Neither event names the person suggested:
   * `position` says how far down the list the follow happened, which is what
   * the ranking needs, and a uid would be personal data in a product event.
   */
  [AnalyticsEvent.FollowSuggestionsShown]: {
    surface: 'onboarding' | 'following' | 'home';
    count: number;
  };
  [AnalyticsEvent.FollowSuggestionFollowed]: {
    surface: 'onboarding' | 'following' | 'home';
    /** One-based place in the list at the moment it was tapped. */
    position: number;
    reason: 'nearby' | 'curated' | 'active';
  };
  /**
   * Any follow, wherever it came from. Until #1708 no follow was counted at
   * all, so followers could not be told apart from everybody else when
   * reading retention.
   */
  [AnalyticsEvent.UserFollowed]: { source: 'suggestion' | 'profile' };
  [AnalyticsEvent.TableSeated]: TableOperationParams & {
    from_status: TableOperationStatus;
    /**
     * The party size, where the host recorded one. Absent otherwise.
     *
     * A party size is not personal guest data: it identifies nobody and cannot
     * be joined back to a person. What issue #1098 excludes is anything that
     * could re-identify a guest - a name, a contact detail, an account id - and
     * none of that reaches this layer, because the staff view never asks for
     * it. Covers per service is the measure the count exists for.
     */
    guests?: number;
  };
  [AnalyticsEvent.TableFreed]: TableOperationParams & {
    from_status: TableOperationStatus;
  };
  [AnalyticsEvent.TableReserved]: TableOperationParams & {
    from_status: TableOperationStatus;
  };
  [AnalyticsEvent.TableCleaningStarted]: TableOperationParams & {
    from_status: TableOperationStatus;
  };
  [AnalyticsEvent.TableDisabled]: TableOperationParams & {
    from_status: TableOperationStatus;
  };
  [AnalyticsEvent.TableVisitOpened]: TableOperationParams & {
    visit_id: string;
  };
  [AnalyticsEvent.TableVisitClosed]: TableOperationParams & {
    visit_id: string;
    /** How the visit ended: staff closed it, or it was abandoned. */
    outcome: 'closed' | 'abandoned';
  };
  /**
   * The top of the funnel, and the one step whose restaurant can be unknown.
   *
   * A token that resolves to nothing names no restaurant and no table - the
   * refusal says why it was refused and not where - so both ids are **absent**
   * on a `refused` or `failed` scan rather than sent empty, the same answer
   * `guests` gives when a host recorded no party size. Every rate over this
   * event therefore reads `outcome` before it reads a restaurant.
   */
  [AnalyticsEvent.TableCodeScanned]: Partial<
    Pick<TableGuestParams, 'restaurant_id' | 'table_id'>
  > &
    Pick<TableGuestParams, 'has_account'> & {
      /** What the scan resolved into, from the guest's side of it. */
      outcome: 'confirm' | 'menu_only' | 'refused' | 'failed';
    };
  [AnalyticsEvent.TableSessionStarted]: TableGuestParams & {
    /** Whether staff had the table seated already, or were only told. */
    status: 'pending' | 'active';
  };
  [AnalyticsEvent.TableOrderSubmitted]: TableGuestParams & {
    /** How many lines the order carried. Never what was on them. */
    line_count: number;
  };
  /**
   * The offer to turn a meal into a Bite, and the draft that accepts it.
   *
   * No `table_id` on either: the object here is the **visit**, which outlives
   * the table it started at and is what `table_visit_closed` above names too -
   * so the two halves of the funnel join on `visit_id` and a table would be a
   * fourth id nothing reads. `My visits` has no table to give in any case: a
   * summary carries the label that was printed on it, not the id behind it.
   */
  [AnalyticsEvent.TableBitePromptShown]: Pick<
    TableGuestParams,
    'restaurant_id' | 'has_account'
  > & {
    visit_id: string;
    /** Which screen offered it: the table, or a visit read later. */
    surface: BitePromptSurface;
  };
  [AnalyticsEvent.TableBiteStarted]: Pick<
    TableGuestParams,
    'restaurant_id' | 'has_account'
  > & {
    visit_id: string;
    surface: BitePromptSurface;
  };
  /**
   * The share-as-image funnel (GitHub issue #1733, `UC-SBS` `R-24`, `R-29`).
   *
   * Every step carries the Bite and, from the composer on, what the image was
   * made as, so each step can be read against the one before it without a
   * join. Nothing else: the image shows a dish name, a place and possibly the
   * sharer's name, and **none of it reaches these parameters** - only the id of
   * the Bite, which the share link already carries in the open.
   *
   * A menu dismissed without a choice emits nothing after `share_menu_opened`,
   * which is how that drop-off is read.
   */
  [AnalyticsEvent.ShareMenuOpened]: Pick<ShareImageParams, 'bite_id'>;
  [AnalyticsEvent.ShareTargetChosen]: Pick<
    ShareImageParams,
    'bite_id' | 'target'
  >;
  [AnalyticsEvent.ShareComposerOpened]: Pick<
    ShareImageParams,
    'bite_id' | 'target' | 'format'
  >;
  /**
   * The user switched the layout. Each switch is one event, and the default
   * layout the composer opens on is not one - it was not chosen, so a composer
   * nobody touched emits none and the hand-off still says which one went out.
   */
  [AnalyticsEvent.ShareTemplateChosen]: ShareImageParams;
  /**
   * The image left BiteTribe: it was saved, or the share sheet reported that
   * an app took it.
   *
   * **Not that anything was posted.** Instagram and Facebook do not tell the
   * app that hands them an image whether the user published it, so the honest
   * last step of this funnel is the hand-off. See `UC-SBS` `G4`: posting is the
   * user's own act in the other app.
   */
  [AnalyticsEvent.ShareHandoffSucceeded]: ShareImageParams & {
    action: ShareImageAction;
  };
  [AnalyticsEvent.ShareHandoffFailed]: ShareImageParams & {
    action: ShareImageAction;
    /**
     * Why the image did not leave. `cancelled` is the user closing the share
     * sheet, which is a drop-off rather than a fault and is counted for that
     * reason.
     */
    reason: 'cancelled' | 'permission_denied' | 'unavailable' | 'failed';
  };
  /**
   * The world page opened (GitHub issue #1787). `own_profile` separates a user
   * looking at their own globe from one looking at somebody else's, which is
   * the question the page was built to answer: is it a mirror or a window.
   */
  [AnalyticsEvent.WorldGlobeOpened]: { own_profile: boolean };
  /**
   * A country tapped on the globe. The alpha-2 code is a country, not a
   * person: the profile's flags show the same list to everybody who can open
   * it. `has_bites` says whether it was a highlighted country, and `source`
   * whether it was tapped on the globe or in the list under it.
   */
  [AnalyticsEvent.WorldGlobeCountryTapped]: {
    country_code: string;
    has_bites: boolean;
    source: 'globe' | 'list';
  };
  /**
   * The globe was zoomed, at most once per visit to the page: the question is
   * whether people zoom at all, and with what, not how often a pinch fires.
   */
  [AnalyticsEvent.WorldGlobeZoomed]: { control: 'button' | 'gesture' };
}

/**
 * The share menu entry the user picked (GitHub issue #1733).
 *
 * One value per `ShareMenuChoice` in `bite-tribe/details`, which maps its
 * entries onto these in `ANALYTICS_TARGET`. Inlined for the reason every other
 * union on this page is; `analytics-events.spec.ts` compares the two as text.
 */
export type ShareTarget =
  | 'instagram_story'
  | 'instagram_post'
  | 'facebook_story'
  | 'save'
  | 'share_image'
  | 'more';

/** What the composer did with the image: saved it, or shared it. */
export type ShareImageAction = 'save' | 'share';

/**
 * What the share-as-image funnel says about each step (GitHub issue #1733).
 *
 * `format` and `template` mirror `ShareImageFormat` and `ShareImageLayoutId`
 * from `bite-tribe/share-image-ui`, inlined and checked as text like the rest.
 */
export interface ShareImageParams {
  /** The Bite being shared. The share link carries the same id. */
  bite_id: string;
  /** The menu entry that started this share. */
  target: ShareTarget;
  /** The image's shape: a 9:16 Story or a 4:5 Post. */
  format: 'story' | 'post';
  /** The layout the image is drawn in. */
  template: 'classic' | 'wide';
}

/**
 * The two screens a meal can be turned into a Bite from (GitHub issue #1112).
 *
 * `table` is the summary while the guest is still sitting there; `visit_detail`
 * is the same meal opened from *My visits* afterwards. They are one parameter
 * rather than two event names because the offer is the same offer - what
 * differs is how long after the meal it was taken, which is what the funnel is
 * trying to find out.
 */
export type BitePromptSurface = 'table' | 'visit_detail';

/**
 * What every guest-side funnel event says about where it happened
 * (GitHub issue #1114).
 *
 * The same shape and the same reasoning as {@link TableOperationParams}: all
 * of them on every event, so no step of the funnel needs a join to be read
 * against the step before it. `table_count` is absent, because a guest's phone
 * has no business knowing how many tables the restaurant has and no measure
 * here is a rate over it.
 *
 * `has_account` is the segmentation the issue asks for, and it says exactly
 * one thing: whether a **member** was signed in at that moment. A table guest
 * holds an anonymous account from the scan onwards, so "signed in" would be
 * true of everybody and mean nothing; what the funnel wants to know is whether
 * this was somebody BiteTribe already had. It carries no uid and nothing that
 * could become one.
 */
export interface TableGuestParams {
  /** The restaurant whose code was scanned. */
  restaurant_id: string;
  /** The table the guest is at. */
  table_id: string;
  /** Whether a registered member was signed in when this happened. */
  has_account: boolean;
}

/**
 * Every table status, mirroring `TableStatus` from `bite-tribe/model`.
 *
 * Inlined for the reason the onboarding and coach-mark unions above are: this
 * taxonomy lives in `scope:common`, which the workspace's dependency
 * constraints allow to depend on `scope:common` alone, and `model` is
 * `scope:bite-tribe`. An import here would not pass lint, so the union is
 * copied and the copy is checked - `analytics-events.spec.ts` compares it
 * against `TABLE_STATUSES` as text, the same answer
 * `table-state-parity.spec.ts` reached for the backend's copy.
 */
export type TableOperationStatus =
  | 'available'
  | 'reserved'
  | 'occupied'
  | 'ordering'
  | 'awaitingPayment'
  | 'cleaning'
  | 'disabled';

/**
 * What every table-operation event says about where it happened
 * (GitHub issue #1098).
 *
 * All three are on every event rather than on the one event that needs each,
 * so no measure depends on joining two event names. `table_count` is the
 * denominator of both rates the issue asks for - turnover per service, and the
 * share of tables ever used - and repeating a value that is constant per
 * restaurant costs a parameter slot out of GA4's twenty-five and buys a query
 * that reads one event stream instead of two.
 *
 * None of the three is personal data. A restaurant id and a table id are the
 * restaurant's own business identifiers, and a visit id names a party without
 * naming anyone in it.
 */
export interface TableOperationParams {
  /** The restaurant the room belongs to. */
  restaurant_id: string;
  /** The table the operation happened to. */
  table_id: string;
  /** How many tables the restaurant has, across all its rooms. */
  table_count: number;
}

/** Which app an event belongs to. */
export type AnalyticsSurface = 'consumer' | 'business';

/**
 * The app each event belongs to (GitHub issue #1098).
 *
 * A `Record` over every event name rather than a set of the business ones, so
 * the next event added to the taxonomy does not compile until somebody decides
 * which app emits it. A set would have defaulted silently, and the default
 * that goes wrong is the one nobody chose.
 *
 * `consumer` covers the admin app too. Nothing in it emits a product event, and
 * its bundle carries no flag of its own to distinguish it - `env-var-plugin.js`
 * says so deliberately, because a second unread marker would look load-bearing.
 * The day the admin app wants its own events, it gets its own flag and its own
 * surface, and this map is where that lands.
 */
export const ANALYTICS_EVENT_SURFACE: Record<
  AnalyticsEventName,
  AnalyticsSurface
> = {
  [AnalyticsEvent.SignUp]: 'consumer',
  [AnalyticsEvent.PasswordResetRequested]: 'consumer',
  [AnalyticsEvent.PasswordResetRequestFailed]: 'consumer',
  [AnalyticsEvent.EmailVerificationPromptShown]: 'consumer',
  [AnalyticsEvent.EmailVerificationResendTapped]: 'consumer',
  [AnalyticsEvent.EmailVerificationResendSucceeded]: 'consumer',
  [AnalyticsEvent.EmailVerificationResendFailed]: 'consumer',
  [AnalyticsEvent.EmailVerificationSynced]: 'consumer',
  [AnalyticsEvent.AccountDeletionStarted]: 'consumer',
  [AnalyticsEvent.AccountDeletionCompleted]: 'consumer',
  [AnalyticsEvent.AccountDeletionFailed]: 'consumer',
  [AnalyticsEvent.BiteCreated]: 'consumer',
  [AnalyticsEvent.BiteImageUploaded]: 'consumer',
  [AnalyticsEvent.BiteImageUploadFailed]: 'consumer',
  [AnalyticsEvent.BiteImageUploadRetried]: 'consumer',
  [AnalyticsEvent.BucketListCreated]: 'consumer',
  [AnalyticsEvent.BucketListRated]: 'consumer',
  [AnalyticsEvent.SearchPerformed]: 'consumer',
  [AnalyticsEvent.RestaurantViewed]: 'consumer',
  [AnalyticsEvent.BiteViewed]: 'consumer',
  [AnalyticsEvent.OnboardingAssistantStarted]: 'consumer',
  [AnalyticsEvent.OnboardingStepCompleted]: 'consumer',
  [AnalyticsEvent.OnboardingAssistantCompleted]: 'consumer',
  [AnalyticsEvent.CoachMarkDismissed]: 'consumer',
  [AnalyticsEvent.FollowSuggestionsShown]: 'consumer',
  [AnalyticsEvent.FollowSuggestionFollowed]: 'consumer',
  [AnalyticsEvent.UserFollowed]: 'consumer',
  [AnalyticsEvent.TableSeated]: 'business',
  [AnalyticsEvent.TableFreed]: 'business',
  [AnalyticsEvent.TableReserved]: 'business',
  [AnalyticsEvent.TableCleaningStarted]: 'business',
  [AnalyticsEvent.TableDisabled]: 'business',
  [AnalyticsEvent.TableVisitOpened]: 'business',
  [AnalyticsEvent.TableVisitClosed]: 'business',
  // The funnel's guest side is the consumer app, and its one business step is
  // `table_visit_closed` above - reused rather than duplicated, because the
  // moment a visit ends is one moment whichever app is watching it.
  [AnalyticsEvent.TableCodeScanned]: 'consumer',
  [AnalyticsEvent.TableSessionStarted]: 'consumer',
  [AnalyticsEvent.TableOrderSubmitted]: 'consumer',
  [AnalyticsEvent.TableBitePromptShown]: 'consumer',
  [AnalyticsEvent.TableBiteStarted]: 'consumer',
  [AnalyticsEvent.ShareMenuOpened]: 'consumer',
  [AnalyticsEvent.ShareTargetChosen]: 'consumer',
  [AnalyticsEvent.ShareComposerOpened]: 'consumer',
  [AnalyticsEvent.ShareTemplateChosen]: 'consumer',
  [AnalyticsEvent.ShareHandoffSucceeded]: 'consumer',
  [AnalyticsEvent.ShareHandoffFailed]: 'consumer',
  [AnalyticsEvent.WorldGlobeOpened]: 'consumer',
  [AnalyticsEvent.WorldGlobeCountryTapped]: 'consumer',
  [AnalyticsEvent.WorldGlobeZoomed]: 'consumer',
};

/**
 * The user property naming which app a session came from.
 *
 * Both apps now report to one GA4 property through one measurement id, and the
 * moment the business app logs its first event the web SDK initializes there
 * too - which starts sending the auto-collected `session_start` and
 * `page_view` of every staff shift to the property the launch dashboard reads.
 * Those cannot be told apart by event name, so the surface has to be said
 * rather than inferred.
 *
 * User-scoped rather than event-scoped, because what the launch tiles need to
 * exclude is the *user*: `activeUsers` counts people, not events. GA4 does not
 * backfill a dimension, so the property is set from both apps now even though
 * only the follow-up filters on it - a filter added later over traffic that
 * never carried the property would exclude nothing.
 */
export const ANALYTICS_SURFACE_USER_PROPERTY = 'app_surface';
