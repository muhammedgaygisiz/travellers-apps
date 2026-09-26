import { Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  Address,
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

/**
 * Whether a Bite already names a restaurant, in any shape - the same test
 * `verifyRestaurantCandidate` applies before it links a Bite (`R-20`).
 */
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
    const { biteIds, image, ...restaurantToBeSaved } = restaurant;

    // Add the new restaurant document without the base64 image
    const addRestaurantResult = await FirebaseFirestore.addDocument({
      reference: RESTAURANT_COLLECTION,
      data: {
        ...restaurantToBeSaved,
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    const newRestaurantId = addRestaurantResult.reference.id;

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

    // Upload image to Firebase Storage and update the restaurant with the imagePath
    if (image) {
      await this.uploadAndSaveRestaurantImage(newRestaurantId, image);
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

  private async uploadAndSaveRestaurantImage(
    restaurantId: string,
    image: string,
  ): Promise<void> {
    const storagePath = await uploadBase64ToFirebaseStorage({
      base64: image,
      docId: restaurantId,
      collection: RESTAURANT_COLLECTION,
    });

    const imagePath = await getDownloadUrlFromFirebaseStorage(storagePath);

    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        imagePath,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });
  }

  saveRestaurantImage(restaurantId: string, image: string): Promise<void> {
    return this.uploadAndSaveRestaurantImage(restaurantId, image);
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
