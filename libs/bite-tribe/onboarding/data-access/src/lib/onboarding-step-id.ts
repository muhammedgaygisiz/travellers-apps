/**
 * Identifiers for the onboarding assistant steps, in the order defined by the
 * epic (#850). The ordered registry that drives the shell lives in the page
 * library; this union is owned by data-access because completed step ids are
 * what gets persisted for resume-after-restart.
 */
export type OnboardingStepId =
  | 'identity'
  | 'visibility'
  | 'currency'
  | 'language'
  | 'location'
  | 'photos'
  | 'notifications'
  | 'finish';
