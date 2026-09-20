import { getFirestore } from 'firebase-admin/firestore';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';

export const updateLastSeen = onAppCheck(async (request) => {
  requireMember(request, 'You must be signed in to update last seen.');

  const userReference = getFirestore()
    .collection('users')
    .doc(request.auth.uid);
  const userSnapshot = await userReference.get();

  if (!userSnapshot.exists) {
    return;
  }

  await userReference.update({
    lastSeen: new Date().toISOString(),
    lastSeenTimestamp: Date.now(),
  });

  return;
});
