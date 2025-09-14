import { DocumentData, DocumentSnapshot } from '@capacitor-firebase/firestore';
import { Bite } from 'model';

export const toBite = (doc: DocumentSnapshot<DocumentData>): Bite =>
  ({
    ...doc.data,
    id: doc.id,
    likes: [],
  } as unknown as Bite);
