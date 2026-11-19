import { Injectable } from '@angular/core';
import { FieldValue, FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  Address,
  CreateAndUploadImageCallbackParams,
  DaySchedule,
  Geopoint,
  Link,
  Restaurant,
  TableOrderingSettings,
} from 'model';
import { MENU_COLLECTION } from '../menu-api/menu-api.service';
import { BITE_COLLECTION, RESTAURANT_COLLECTION } from '../utils/constants';
import { getRestaurantById } from './utils/get-restaurant-by-id';
import { uploadBase64ToFirebaseStorage } from '../utils/upload-base64-to-firebase-storage';
import { getDownloadUrlFromFirebaseStorage } from 'utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Whether a Bite already names a restaurant, in any shape - the same test
 * `verifyRestaurantCandidate` applies before it links a Bite (`R-20`).
 */
/**
 * How long a restaurant photo upload may go without reporting progress before
 * it counts as failed (GitHub issue #2172). The window a Bite photo and a
 * profile photo use: offline, the Storage SDK retries quietly for minutes and
 * never reaches its error branch, which left the save page looking idle.
 */
export const RESTAURANT_IMAGE_STALL_MS = 30 * 1000;

const hasRestaurant = (data: Record<string, unknown>): boolean => {
  const restaurantId = data['restaurantId'];

  return typeof restaurantId === 'string'
    ? restaurantId.trim().length > 0
    : restaurantId !== undefined && restaurantId !== null;
};

@Injectable({ providedIn: 'root' })
export class RestaurantApiService {
  loadRestaurantById(restaurantId: string): Promise<Restaurant | undefined> {
    return getRestaurantById(restaurantId);
  }

  async saveNewRestaurant(restaurant: Restaurant): Promise<void> {
    // Remove biteIds and image (base64) from the restaurant object before saving to Firestore.
    // The image will be uploaded to Firebase Storage separately and linked via imagePath.
    // A restaurant created here has no candidate - a candidate goes through
    // `verifyRestaurantCandidate` - so its id is never written. It used to be
    // passed through as `undefined`, which the web Firestore SDK rejects, and
    // the restaurant was never created (issue #1952). Any other field left
    // `undefined` is dropped for the same reason.
    const {
      biteIds,
      image,
      restaurantCandidateId: _candidateId,
      ...rest
    } = restaurant;
    void _candidateId;
    const restaurantToBeSaved = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    );

    // The id is chosen here, the way a Bite's is (`createBite`), so the photo
    // can be uploaded under the restaurant's own folder *before* anything is
    // written (issue #2172): a stalled or failed upload stops the save here,
    // and a retry cannot leave a first restaurant behind without its photo.
    const newRestaurantId = uuidv4();

    if (image) {
      restaurantToBeSaved['imagePath'] = await this.uploadRestaurantImageForUrl(
        newRestaurantId,
        image,
      );
    }

    // Create the restaurant document without the base64 image
    await FirebaseFirestore.setDocument({
      reference: `${RESTAURANT_COLLECTION}/${newRestaurantId}`,
      data: {
        ...restaurantToBeSaved,
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    // Add a new menu for the restaurant. It names the restaurant it belongs
    // to, which is what the ownership-scoped rules authorise a menu write from
    // (issue #1078); the restaurant document already exists at this point, so
    // there is a document for the rule to read.
    const addMenuResult = await FirebaseFirestore.addDocument({
      reference: MENU_COLLECTION,
      data: {
        restaurantId: newRestaurantId,
        categories: [],
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    // Update the restaurant with the menu ID
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${newRestaurantId}`,
      data: {
        menuId: `${addMenuResult.reference.id}`,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    // Link the bites to the new restaurant
    if (biteIds && biteIds.length > 0) {
      await Promise.all(
        biteIds.map((biteId) => this.linkBite(biteId, newRestaurantId)),
      );
    }
  }

  /**
   * Points one Bite at a new restaurant, unless it already names one.
   *
   * The ids were read when the operator opened the list, so a Bite can have
   * been assigned since - by its creator, or by a candidate verification. It
   * keeps that assignment, the same rule `UC-VRC` `R-20` holds for `V23`
   * (issues #1498, #1631). A Bite deleted in the meantime is skipped too,
   * rather than failing the whole save. The read and the write are not one
   * transaction, which the plugin does not offer; the window this leaves is
   * the few milliseconds between them rather than the time the list was open.
   */
  private async linkBite(biteId: string, restaurantId: string): Promise<void> {
    const { snapshot } = await FirebaseFirestore.getDocument({
      reference: `${BITE_COLLECTION}/${biteId}`,
    });

    if (!snapshot?.data || hasRestaurant(snapshot.data)) {
      return;
    }

    await FirebaseFirestore.updateDocument({
      reference: `${BITE_COLLECTION}/${biteId}`,
      data: {
        restaurantId: `${restaurantId}`,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });
  }

  /**
   * Uploads a restaurant photo under `images/restaurants/{key}/` and answers
   * its download URL, without writing to Firestore (GitHub issue #1504).
   *
   * Candidate verification uploads with the candidate id as the key, before
   * the restaurant exists, and hands the URL to `verifyRestaurantCandidate`,
   * which writes it inside its transaction. The key only names the folder:
   * what the restaurant stores is the URL.
   */
  async uploadRestaurantImageForUrl(
    key: string,
    image: string,
    stallMs: number = RESTAURANT_IMAGE_STALL_MS,
  ): Promise<string> {
    const storagePath = await this.uploadWithStallWindow(key, image, stallMs);

    const downloadUrl = await getDownloadUrlFromFirebaseStorage(storagePath);

    // A photo the restaurant cannot point at is a failed upload: the caller
    // must not go on to create the restaurant without it (issue #1504).
    if (!downloadUrl) {
      throw new Error('The uploaded restaurant photo has no download URL.');
    }

    return downloadUrl;
  }

  /**
   * Rejects an upload that reports no progress for `stallMs` (GitHub issue
   * #2172). The plugin cannot cancel a transfer, so a stalled one is only
   * abandoned: if it lands later, the object it leaves is referenced by
   * nothing, because the flow that started it has already stopped.
   */
  private uploadWithStallWindow(
    key: string,
    image: string,
    stallMs: number,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;

      const stall = (): void => {
        settled = true;
        reject(new Error('The restaurant photo upload stalled.'));
      };
      const restart = (): void => {
        clearTimeout(timer);
        timer = setTimeout(stall, stallMs);
      };
      restart();

      uploadBase64ToFirebaseStorage({
        base64: image,
        docId: key,
        collection: RESTAURANT_COLLECTION,
        callbackFn: (progress) => {
          if (!settled && progress.uploadParams?.evt?.completed === false) {
            restart();
          }
        },
      }).then(
        (storagePath) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          resolve(storagePath);
        },
        (error: unknown) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  /**
   * Sends a restaurant photo chosen in the business app (GitHub issue #2126).
   * Started by the upload service and not awaited by the page: the outcome
   * arrives through `callbackFn`, and the finalize trigger
   * `setRestaurantImagePathOnUpload` points the restaurant at the object even
   * if this device is gone by then - the way a profile photo is sent (#1953).
   */
  async uploadRestaurantImage(
    restaurantId: string,
    photo: string,
    callbackFn: (p: CreateAndUploadImageCallbackParams) => void,
  ): Promise<void> {
    await uploadBase64ToFirebaseStorage({
      base64: photo,
      docId: restaurantId,
      collection: RESTAURANT_COLLECTION,
      callbackFn,
    });
  }

  /**
   * Points the restaurant at a finished upload. The finalize trigger writes the
   * same thing; the client does too so the page shows the photo at once.
   */
  async setUploadedRestaurantImage(
    restaurantId: string,
    storagePath: string,
  ): Promise<string> {
    const imagePath =
      (await getDownloadUrlFromFirebaseStorage(storagePath)) || '';

    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        imagePath,
        imageStatus: 'uploaded',
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });

    return imagePath;
  }

  /**
   * Records a photo upload's status. Thrown errors are the caller's to swallow:
   * offline the write lands in the local cache at once but only resolves once
   * the server acknowledges it (see GitHub issue #1390).
   */
  async setRestaurantImageStatus(
    restaurantId: string,
    imageStatus: 'pending' | 'failed',
    imageUploadStartedAt?: number,
  ): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        imageStatus,
        ...(imageUploadStartedAt === undefined
          ? {}
          : { imageUploadStartedAtTimestamp: imageUploadStartedAt }),
      },
    });
  }

  /**
   * Records that an account holding the restaurant saved its menu (GitHub
   * issue #2126). Its own write after the menu save, so an operator's save
   * from the admin app, which never calls this, does not count.
   */
  async markMenuReviewed(restaurantId: string): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        menuReviewedAt: new Date().toISOString(),
        menuReviewedAtTimestamp: Date.now(),
      },
    });
  }

  async createMenuForRestaurant(restaurantId: string): Promise<string> {
    const addMenuResult = await FirebaseFirestore.addDocument({
      reference: MENU_COLLECTION,
      data: {
        // Names the restaurant so the rules can authorise this write and every
        // later edit of the menu (issue #1078).
        restaurantId,
        categories: [],
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Date.now(),
      },
    });

    const menuId = addMenuResult.reference.id;

    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        menuId: `${menuId}`,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });

    return menuId;
  }

  async saveSocialMediaLinksForRestaurant(
    restaurantId: string,
    links: Link[],
  ): Promise<void> {
    // Update the restaurant with the social media links
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        socialMediaLinks: links,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });
  }

  async saveDescriptionForRestaurant(
    restaurantId: string,
    description: string,
  ): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        description,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });
  }

  async saveOpeningHoursForRestaurant(
    restaurantId: string,
    openingHours: DaySchedule[],
  ): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        openingHours,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });
  }

  /**
   * How this restaurant uses its QR codes (GitHub issue #1102).
   *
   * The whole `tableOrdering` object on every save, including a staff-side
   * pause the owner's form never shows: `updateDocument` replaces a map rather
   * than merging into it, so writing only `enabled` and `timeZone` would clear
   * a pause somebody set during service.
   */
  async saveTableOrderingForRestaurant(
    restaurantId: string,
    tableOrdering: TableOrderingSettings,
  ): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        tableOrdering,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });
  }

  /**
   * Whether the restaurant has a gender-neutral restroom (GitHub issue #1830).
   *
   * **`undefined` removes the field rather than storing `false`.** The
   * restaurant choosing "Not stated" is taking back an answer, and `false` is
   * an answer: it would tell a guest "no" on behalf of a restaurant that never
   * said so. `FieldValue.delete()` is the plugin's own marker, for the reason
   * `saveMenuCurrency` gives.
   *
   * Written through the field path rather than as a `facilities` map, because
   * `updateDocument` replaces a map: saving this one fact as `{ facilities: {...} }`
   * would wipe the next facility added beside it.
   */
  async saveGenderNeutralRestroomForRestaurant(
    restaurantId: string,
    genderNeutralRestroom: boolean | undefined,
  ): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        'facilities.genderNeutralRestroom':
          genderNeutralRestroom ?? FieldValue.delete(),
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });
  }

  async saveAddressForRestaurant(
    restaurantId: string,
    address: Address,
  ): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        address,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });
  }

  async savePositionForRestaurant(
    restaurantId: string,
    position: Geopoint,
  ): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        position,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });
  }
}
