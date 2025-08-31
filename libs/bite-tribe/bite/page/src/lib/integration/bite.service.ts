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

  submitNewBite(newBite: any): void {
     
    const { id, ...biteData } = newBite;

    this.dataAccess.submitBite(biteData);

    this.navController.navigateBack(['home']);
  }

  submitEditedBite(editedBite: any): void {
    this.dataAccess.submitBite(editedBite);

    this.navController.navigateBack(['my-bites']);
  }

  startCropImage(image: string | null): void {
    if (image) {
      this.originalImage.set(image);
      this.navController.navigateForward(['image-crop']);
    }
  }

  setCroppedImage(image: string): void {
    this.croppedImage.set(image);
    this.navController.back();
  }
}
