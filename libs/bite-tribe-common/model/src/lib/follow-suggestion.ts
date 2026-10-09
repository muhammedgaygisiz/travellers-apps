/**
 * Why a person was suggested to follow (GitHub issue #1708).
 *
 * `nearby` posts around the viewer's position, `curated` is a hand-picked
 * account from `config/newUserFollowUp`, and `active` is among the accounts
 * with the most Bites. The card shows it as a short reason line.
 */
export type FollowSuggestionReason = 'nearby' | 'curated' | 'active';

/** One person the `suggestPeopleToFollow` callable answers with. */
export interface FollowSuggestion {
  userId: string;
  displayName: string;
  photoUrl?: string;
  biteCount: number;
  reason: FollowSuggestionReason;
}

/** Where suggestions are shown, which is also the analytics `surface`. */
export type FollowSuggestionSurface = 'onboarding' | 'following_empty' | 'home';
