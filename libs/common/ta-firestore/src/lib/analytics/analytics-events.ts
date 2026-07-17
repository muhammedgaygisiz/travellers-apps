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
  // Creation
  BiteCreated: 'bite_created',
  BiteImageUploaded: 'bite_image_uploaded',
  BiteImageUploadFailed: 'bite_image_upload_failed',
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
  [AnalyticsEvent.EmailVerificationSynced]: {
    verified: boolean;
    source: 'app_start' | 'app_resume' | 'profile_edit';
  };
  [AnalyticsEvent.BiteCreated]: never;
  [AnalyticsEvent.BiteImageUploaded]: never;
  [AnalyticsEvent.BiteImageUploadFailed]: { code: string };
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
      | 'leaderboard';
  };
}
