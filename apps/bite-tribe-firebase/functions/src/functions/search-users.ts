import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/https';

const MIN_SEARCH_TEXT_LENGTH = 3;
const MAX_RESULTS = 20;

interface SearchUsersRequest {
  searchText?: unknown;
}

interface SearchUser {
  userId: string;
  displayName: string;
  fullName?: string;
  email: string;
  photoUrl: string;
  city?: string;
  about?: string;
  public?: boolean;
  isOrganisation?: boolean;
  isRestaurant?: boolean;
}

const toSearchUser = (
  doc: admin.firestore.QueryDocumentSnapshot,
): SearchUser => {
  const user = doc.data();

  return {
    userId: typeof user['userId'] === 'string' ? user['userId'] : doc.id,
    displayName:
      typeof user['displayName'] === 'string' ? user['displayName'] : '',
    ...(typeof user['fullName'] === 'string'
      ? { fullName: user['fullName'] }
      : {}),
    email: typeof user['email'] === 'string' ? user['email'] : '',
    photoUrl: typeof user['photoUrl'] === 'string' ? user['photoUrl'] : '',
    ...(typeof user['city'] === 'string' ? { city: user['city'] } : {}),
    ...(typeof user['about'] === 'string' ? { about: user['about'] } : {}),
    ...(typeof user['public'] === 'boolean' ? { public: user['public'] } : {}),
    ...(typeof user['isOrganisation'] === 'boolean'
      ? { isOrganisation: user['isOrganisation'] }
      : {}),
    ...(typeof user['isRestaurant'] === 'boolean'
      ? { isRestaurant: user['isRestaurant'] }
      : {}),
  };
};

export const searchUsers = onCall<SearchUsersRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to search for users.',
    );
  }

  if (typeof request.data.searchText !== 'string') {
    throw new HttpsError('invalid-argument', 'searchText must be a string.');
  }

  const searchText = request.data.searchText.trim().toLocaleLowerCase();

  if (searchText.length < MIN_SEARCH_TEXT_LENGTH) {
    return [];
  }

  const usersSnapshot = await admin.firestore().collection('users').get();

  return usersSnapshot.docs
    .filter((doc) => {
      const user = doc.data();
      const displayName =
        typeof user['displayName'] === 'string'
          ? user['displayName'].toLocaleLowerCase()
          : '';
      const email =
        typeof user['email'] === 'string'
          ? user['email'].toLocaleLowerCase()
          : '';
      const fullName =
        typeof user['fullName'] === 'string'
          ? user['fullName'].toLocaleLowerCase()
          : '';

      return (
        user['public'] === true &&
        (displayName.includes(searchText) ||
          email.includes(searchText) ||
          fullName.includes(searchText))
      );
    })
    .slice(0, MAX_RESULTS)
    .map(toSearchUser);
});
