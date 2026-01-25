import { DocumentData, DocumentSnapshot } from '@capacitor-firebase/firestore';
import { PublicUser } from 'model';

export const toPublicUser = (doc: DocumentSnapshot<DocumentData>): PublicUser =>
  ({
    ...doc.data,
    userId: doc.id,
  }) as unknown as PublicUser;
