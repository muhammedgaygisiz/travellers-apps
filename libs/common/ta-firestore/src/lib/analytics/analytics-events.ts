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
  // Table operations, business app (epic #1071, issue #1098)
  TableSeated: 'table_seated',
  TableFreed: 'table_freed',
  TableReserved: 'table_reserved',
  TableCleaningStarted: 'table_cleaning_started',
  TableDisabled: 'table_disabled',
  TableVisitOpened: 'table_visit_opened',
  TableVisitClosed: 'table_visit_closed',
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
  [AnalyticsEvent.BiteCreated]: never;
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
  [AnalyticsEvent.TableSeated]: 'business',
  [AnalyticsEvent.TableFreed]: 'business',
  [AnalyticsEvent.TableReserved]: 'business',
  [AnalyticsEvent.TableCleaningStarted]: 'business',
  [AnalyticsEvent.TableDisabled]: 'business',
  [AnalyticsEvent.TableVisitOpened]: 'business',
  [AnalyticsEvent.TableVisitClosed]: 'business',
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
