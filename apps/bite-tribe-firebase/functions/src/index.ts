import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { notifyFollowersOnNewBite } from './functions/notifications/notify-followers-on-new-bite';
export { notifyBiteCreatorOnLike } from './functions/notifications/notify-bite-creator-on-like';
export { notifyBiteCreatorOnReview } from './functions/notifications/notify-bite-creator-on-review';
export { notifyUserOnNewFollower } from './functions/notifications/notify-user-on-new-follower';
export { handleSharedLinkToBite } from './functions/bites/handle-shared-link-to-bite';
export { sendWeeklyBiteNotification } from './functions/notifications/send-weekly-bite-notification';
export { setBiteImagePathOnUpload } from './functions/bites/set-bite-image-path-on-upload';
export {
  backfillBiteAddress,
  enrichBiteAddressOnCreate,
} from './functions/bites/enrich-bite-address-on-create';
export { searchUsers } from './functions/users/search-users';
export { searchBites } from './functions/bites/search-bites';
export { searchBitesByCity } from './functions/bites/search-bites-by-city';
export { searchRestaurants } from './functions/restaurants/search-restaurants';
export {
  searchPlaces,
  searchNearbyPlaces,
} from './functions/restaurants/search-places';
export { getPlaceDetails } from './functions/restaurants/get-place-details';
export { updateLastSeen } from './functions/users/update-last-seen';
export { updateUserMetadata } from './functions/users/update-user-metadata';
export { resendEmailVerification } from './functions/users/resend-email-verification';
export { syncEmailVerificationStatus } from './functions/users/sync-email-verification-status';
export { sendEmailVerificationReminders } from './functions/users/send-email-verification-reminders';
export { loadBitesByLocation } from './functions/bites/load-bites-by-location';
export { loadWeeklyBites } from './functions/bites/load-weekly-bites';
export { getCurrencyByPosition } from './functions/location/get-currency-by-position';
export { clusterRestaurantCandidateForBite } from './functions/restaurants/cluster-restaurant-candidate-for-bite';
export { createRestaurantCandidateOnBiteCreate } from './functions/restaurants/create-restaurant-candidate-on-bite-create';
export { verifyRestaurantCandidate } from './functions/restaurants/verify-restaurant-candidate';
export { createUserOnAuthCreate } from './functions/users/create-user-on-auth-create';
export { claimDisplayName } from './functions/users/claim-display-name';
export { deleteOwnAccount } from './functions/users/delete-own-account';
export { checkDisplayNameAvailability } from './functions/users/check-display-name-availability';
export { backfillDisplayNameClaimsCallable } from './functions/users/backfill-display-name-claims';
export { loadLeaderboard } from './functions/leaderboard/load-leaderboard';
export { sendDailyLeaderboardNotification } from './functions/leaderboard/send-daily-leaderboard-notification';
export { resyncBiteCounts } from './functions/leaderboard/resync-bite-counts';
export {
  decrementBiteCountOnBiteDelete,
  incrementBiteCountOnBiteCreate,
} from './functions/bites/increment-bite-count-on-bite-create';
export {
  decrementBiteLikeCountOnLikeDelete,
  incrementBiteLikeCountOnLikeCreate,
  updateBiteLikeCountOnLikeUpdate,
} from './functions/bites/update-bite-like-count-on-like-write';
export {
  decrementFollowersCountOnFollowerDelete,
  decrementFollowingCountOnFollowingDelete,
  incrementFollowersCountOnFollowerCreate,
  incrementFollowingCountOnFollowingCreate,
} from './functions/users/update-follow-counts-on-follow-write';
export { resyncFollowCounts } from './functions/users/resync-follow-counts';
