import * as admin from 'firebase-admin';

admin.initializeApp();

export { notifyFollowersOnNewBite } from './functions/notify-followers-on-new-bite';
export { notifyBiteCreatorOnLike } from './functions/notify-bite-creator-on-like';
export { notifyBiteCreatorOnReview } from './functions/notify-bite-creator-on-review';
export { notifyUserOnNewFollower } from './functions/notify-user-on-new-follower';
export { handleSharedLinkToBite } from './functions/handle-shared-link-to-bite';
export { sendWeeklyBiteNotification } from './functions/send-weekly-bite-notification';
export { setBiteImagePathOnUpload } from './functions/set-bite-image-path-on-upload';
export { searchUsers } from './functions/search-users';
export { searchBites } from './functions/search-bites';
export { searchRestaurants } from './functions/search-restaurants';
