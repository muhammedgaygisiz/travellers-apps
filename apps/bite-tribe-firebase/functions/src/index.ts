import * as admin from 'firebase-admin';

admin.initializeApp();

export { notifyFollowersOnNewBite } from './functions/notify-followers-on-new-bite';
export { notifyBiteCreatorOnLike } from './functions/notify-bite-creator-on-like';
export { handleSharedLinkToBite } from './functions/handle-shared-link-to-bite';
