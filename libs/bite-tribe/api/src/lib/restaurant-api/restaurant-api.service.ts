import { Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { DaySchedule, Link, Restaurant } from 'model';
import { MENU_COLLECTION } from '../menu-api/menu-api.service';
import { BITE_COLLECTION, RESTAURANT_COLLECTION } from '../utils/constants';
import { getRestaurantById } from './utils/get-restaurant-by-id';
import { uploadBase64ToFirebaseStorage } from '../utils/upload-base64-to-firebase-storage';
import { getDownloadUrlFromFirebaseStorage } from 'utils';

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

    // Add a new menu for the restaurant
    const addMenuResult = await FirebaseFirestore.addDocument({
      reference: MENU_COLLECTION,
      data: {
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

    // Update the bites with the new restaurant ID
    if (biteIds && biteIds.length > 0) {
      await Promise.all(
        biteIds.map((biteId) =>
          FirebaseFirestore.updateDocument({
            reference: `${BITE_COLLECTION}/${biteId}`,
            data: {
              restaurantId: `${newRestaurantId}`,
              updatedAt: new Date().toISOString(),
              updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
            },
          }),
        ),
      );
    }

    // Upload image to Firebase Storage and update the restaurant with the imagePath
    if (image) {
      await this.uploadAndSaveRestaurantImage(newRestaurantId, image);
    }
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

  async createMenuForRestaurant(restaurantId: string): Promise<string> {
    const addMenuResult = await FirebaseFirestore.addDocument({
      reference: MENU_COLLECTION,
      data: {
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
}
