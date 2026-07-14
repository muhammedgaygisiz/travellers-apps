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
  [AnalyticsEvent.BiteCreated]: never;
  [AnalyticsEvent.BiteImageUploaded]: never;
  [AnalyticsEvent.BiteImageUploadFailed]: { code: string };
  [AnalyticsEvent.BucketListCreated]: never;
  [AnalyticsEvent.BucketListRated]: { rating: number };
  [AnalyticsEvent.SearchPerformed]: never;
  [AnalyticsEvent.RestaurantViewed]: { verified: boolean };
  [AnalyticsEvent.BiteViewed]: never;
}
