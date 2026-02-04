import { Location } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LoadingController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class BiteService {
  public readonly dataAccess = inject(BiteDataAccessService);
  private readonly location = inject(Location);

  image = signal<string>('');

  bite = this.dataAccess.bite;
  currency = this.dataAccess.currency;
  position = this.dataAccess.position;
  cachedBite = this.dataAccess.cachedBite;
  nearbyRestaurants = this.dataAccess.nearbyRestaurants;
  tagSuggestionsForEditingBite = this.dataAccess.tagSuggestionsForEditingBite;
  uploadingProgressForBiteImage = this.dataAccess.uploadingProgressForBiteImage;
  biteIdWithUploadingImage = this.dataAccess.biteIdWithUploadingImage;

  submitNewBite(newBite: any): void {
    const { id, ...biteData } = newBite;

    this.dataAccess.submitBite(biteData);
  }

  submitEditedBite(editedBite: any): void {
    this.dataAccess.submitBite(editedBite);

    this.location.back();
  }

  setEditingBite(bite: Partial<any>): void {
    this.dataAccess.setEditingBite(bite);
  }
}
