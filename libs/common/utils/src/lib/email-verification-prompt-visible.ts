interface EmailVerificationVisibilityState {
  emailVerificationRequired?: boolean;
  emailVerified?: boolean;
}

export const isEmailVerificationPromptVisible = (
  user: EmailVerificationVisibilityState | null | undefined,
): boolean =>
  user?.emailVerificationRequired === true && user.emailVerified !== true;
