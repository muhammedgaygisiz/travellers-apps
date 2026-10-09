/**
 * Who may be put in front of another user as somebody to follow.
 *
 * Two surfaces suggest people: the follow-up mail the day after sign-up
 * (GitHub issue #1707) and the in-app follow suggestions (GitHub issue #1708).
 * Both read this one rule, so the mail and the app cannot disagree about
 * whether an account may be suggested at all.
 *
 * A private profile is never suggested: suggesting it would publish the
 * account to strangers, which is what private means it does not want. An
 * account without a display name has nothing to show on the card.
 */
export const toText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** Only an absolute `https` URL: neither a mail client nor a card resolves anything else. */
export const toHttpsUrl = (value: unknown): string | undefined => {
  const text = toText(value);

  return text?.startsWith('https://') ? text : undefined;
};

export const isSuggestableProfile = (
  data: Record<string, unknown> | undefined,
): boolean => data?.['public'] === true && !!toText(data?.['displayName']);
