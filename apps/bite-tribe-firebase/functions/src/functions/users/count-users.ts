import { getFirestore } from 'firebase-admin/firestore';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';

/**
 * How many accounts BiteTribe has, for the About page.
 *
 * The page used to count `/users` itself. Since GitHub issue #1863 a member
 * reads another account's profile only while it is public, and a count is a
 * query the rules have to allow for every document it could cover, so the
 * client can no longer count the private ones. The number is not private: it
 * is the same total the page always showed, private accounts included.
 */
export const countUsers = onAppCheck(async (request): Promise<number> => {
  requireMember(request, 'You must be signed in to count the members.');

  const snapshot = await getFirestore().collection('users').count().get();

  return snapshot.data().count;
});
