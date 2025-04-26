import { Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

const BITE_COLLECTION = 'bites';

@Injectable({
  providedIn: 'root',
})
export class BiteTribeApiService {
  saveNewBite(bite: any) {
    FirebaseFirestore.addDocument({
      reference: BITE_COLLECTION,
      data: {
        ...bite,
      },
    });
  }
}
