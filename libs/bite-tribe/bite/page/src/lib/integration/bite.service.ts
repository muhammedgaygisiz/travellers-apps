import { Location } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { NavController } from '@ionic/angular';
import { LoadingController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class BiteService {
  public readonly dataAccess = inject(BiteDataAccessService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly loadingController = inject(LoadingController);

  image = signal<string>('');

  bite = this.dataAccess.bite;
  currency = this.dataAccess.currency;
  position = this.dataAccess.position;
  cachedBite = this.dataAccess.cachedBite;
  nearbyRestaurants = this.dataAccess.nearbyRestaurants;
  tagSuggestionsForEditingBite = this.dataAccess.tagSuggestionsForEditingBite;
  uploadingProgressForBiteImage = this.dataAccess.uploadingProgressForBiteImage;
  biteIdWithUploadingImage = this.dataAccess.biteIdWithUploadingImage;

  loading: HTMLIonLoadingElement | null = null;

  async submitNewBite(newBite: any): Promise<void> {
    const { id, ...biteData } = newBite;

    this.dataAccess.submitBite(biteData);

    this.loading = await this.loadingController.create({
      duration: 3000,
    });

    await this.loading.present();
  }

  navigationEffect = effect(() => {
    const biteIdUploadingImage = this.biteIdWithUploadingImage();

    if (!biteIdUploadingImage) {
      return;
    }

    const uploadProgress = this.uploadingProgressForBiteImage();
    if (!uploadProgress) {
      return;
    }

    const uploadParams = uploadProgress[biteIdUploadingImage];
    if (!uploadParams) {
      return;
    }

    if (uploadParams.evt?.completed) {
      setTimeout(() => {
        this.loading?.dismiss();
        this.navController.navigateBack(['home']);
      }, 3000);
      return;
    }
  });

  isLoading = computed(() => {
    const biteIdUploadingImage = this.biteIdWithUploadingImage();

    if (!biteIdUploadingImage) {
      return false;
    }

    const uploadProgress = this.uploadingProgressForBiteImage();
    if (!uploadProgress) {
      return false;
    }

    const uploadParams = uploadProgress[biteIdUploadingImage];
    if (uploadParams.evt && !uploadParams.evt.completed) {
      return true;
    }

    return false;
  });

  submitEditedBite(editedBite: any): void {
    this.dataAccess.submitBite(editedBite);

    this.location.back();
  }

  setEditingBite(bite: Partial<any>): void {
    this.dataAccess.setEditingBite(bite);
  }
}
