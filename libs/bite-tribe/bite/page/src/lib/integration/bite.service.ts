import { Location } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import type { Geopoint } from 'model';
import {
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class BiteService {
  public readonly dataAccess = inject(BiteDataAccessService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly loadingController = inject(LoadingController);
  private readonly transloco = inject(TranslocoService);
  private readonly toastController = inject(ToastController);

  image = signal<string>('');

  bite = this.dataAccess.bite;
  currency = this.dataAccess.currency;
  favCurrencies = this.dataAccess.favCurrencies;
  position = this.dataAccess.position;
  cachedBite = this.dataAccess.cachedBite;
  nearbyRestaurants = this.dataAccess.nearbyRestaurants;
  tagSuggestionsForEditingBite = this.dataAccess.tagSuggestionsForEditingBite;
  networkStatus = this.dataAccess.networkStatus;
  googlePlaces = this.dataAccess.googlePlaces;
  googlePlacesLoading = this.dataAccess.googlePlacesLoading;

  /** Currency derived from the bite position; `undefined` until resolved. */
  private readonly positionCurrency = signal<string | undefined>(undefined);

  /** `true` while the position-based currency lookup is in flight. */
  private readonly currencyLoading = signal(false);

  private lastLookedUpPosition?: Geopoint;

  /**
   * The currency to prefill: the position-derived currency when available,
   * otherwise the user's preferred currency from settings (fallback).
   */
  readonly effectiveCurrency = computed(
    () => this.positionCurrency() ?? this.currency(),
  );

  /** Whether the position-based currency lookup is currently running. */
  readonly isCurrencyLoading = this.currencyLoading.asReadonly();

  /**
   * Resolves the currency for the given bite position via the Cloud Function
   * and prefills it. Only overrides the fallback when a currency is found, so
   * the preferred currency remains the fallback.
   */
  async determineCurrencyForPosition(position?: Geopoint): Promise<void> {
    if (!position || this.isSamePosition(position, this.lastLookedUpPosition)) {
      return;
    }

    this.lastLookedUpPosition = position;
    this.currencyLoading.set(true);

    try {
      const currency = await this.dataAccess.getCurrencyByPosition(position);

      if (currency) {
        this.positionCurrency.set(currency);
      }
    } finally {
      this.currencyLoading.set(false);
    }
  }

  private isSamePosition(a: Geopoint, b?: Geopoint): boolean {
    return !!b && a.latitude === b.latitude && a.longitude === b.longitude;
  }

  async submitNewBite(newBite: any): Promise<void> {
    const loading = await this.loadingController.create({
      message: this.transloco.translate('creating-bite'),
      backdropDismiss: false,
      cssClass: 'bite-creating-loading',
    });
    await loading.present();

    const { id, ...biteData } = newBite;
    try {
      await this.dataAccess.submitNewBite(biteData);

      void this.navController.navigateBack(['home']);

      void this.showToast('bite-created-successfully');
    } finally {
      await loading.dismiss();
    }
  }

  submitEditedBite(editedBite: any): void {
    void this.dataAccess.submitEditedBite(editedBite);
    this.location.back();
  }

  setEditingBite(bite: Partial<any>): void {
    this.dataAccess.setEditingBite(bite);
  }

  searchGooglePlaces(searchText: string): void {
    this.dataAccess.searchGooglePlaces(searchText);
  }

  private async showToast(key: string): Promise<void> {
    const currentToast = await this.toastController.create({
      message: this.transloco.translate(key),
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await currentToast.present();
  }
}
