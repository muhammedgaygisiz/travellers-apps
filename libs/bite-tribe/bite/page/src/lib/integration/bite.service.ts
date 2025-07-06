import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class BiteService {
  public readonly dataAccess = inject(BiteDataAccessService);
  private readonly navController = inject(NavController);

  originalImage = signal<string>('');
  croppedImage = signal<string>('');

  bite = this.dataAccess.bite;
  currency = this.dataAccess.currency;
  position = this.dataAccess.position;
  cachedBite = this.dataAccess.cachedBite;

  imageToDisplay = computed(() => {
    const croppedImage = this.croppedImage();
    const originalImage = this.originalImage();

    if (croppedImage) {
      return croppedImage;
    }
    return originalImage;
  });

  submitNewBite(newBite: any) {
    // eslint-disable-next-line no-unused-vars
    const { id, ...biteData } = newBite;

    this.dataAccess.submitNewBite(biteData);

    this.navController.navigateBack(['home']);
  }

  submitEditedBite(editedBite: any) {
    this.dataAccess.submitEditedBite(editedBite);

    this.navController.navigateBack(['my-bites']);
  }

  startCropImage(image: string | null) {
    if (image) {
      this.setEditedImage(image);
      this.navController.navigateForward(['image-crop']);
    }
  }

  setEditedImage(image: string) {
    this.originalImage.set(image);
    this.dataAccess.setEditedImage(image);
  }

  setCroppedImage(image: string) {
    this.croppedImage.set(image);
    this.dataAccess.setEditedImage(image);
    this.navController.back();
  }
}
