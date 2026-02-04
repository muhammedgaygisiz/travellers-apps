import { Location } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { Bite } from 'model';

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

  submitNewBite(newBite: Bite): void {
    const { id, ...biteData } = newBite;

    this.dataAccess.submitBite(biteData as Bite);
  }

  submitEditedBite(editedBite: any): void {
    this.dataAccess.submitBite(editedBite);

    this.location.back();
  }

  setEditingBite(bite: Partial<any>): void {
    this.dataAccess.setEditingBite(bite);
  }
}
