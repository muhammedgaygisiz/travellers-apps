export interface ProfileMetaData {
  followers: number;
  following: number;
  isFollowedByMe: boolean;
  /**
   * Whether the viewer has a pending request to follow this profile, which
   * only a private profile can have (GitHub issue #2164).
   */
  isRequestedByMe: boolean;
}
