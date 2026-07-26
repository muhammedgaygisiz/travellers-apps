import { Location } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import type { Bite, Geopoint } from 'model';
import type { BiteFormValue } from '../components/page/bite.page';
import {
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

@Injectable({ providedIn: 'root' })
export class BiteService {
  public readonly dataAccess = inject(BiteDataAccessService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly loadingController = inject(LoadingController);
  private readonly transloco = inject(TranslocoService);
  private readonly toastController = inject(ToastController);
  private readonly analytics = inject(AnalyticsService);

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
  nearbyGooglePlaces = this.dataAccess.nearbyGooglePlaces;
  nearbyGooglePlacesLoading = this.dataAccess.nearbyGooglePlacesLoading;

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

  async submitNewBite(newBite: BiteFormValue): Promise<void> {
    await this.createBite(newBite, () => {
      void this.navController.navigateBack(['home']);

      void this.showToast('bite-created-successfully');
    });
  }

  /**
   * Creates the Bite but keeps the user on the create form so the next Bite at
   * the same place can be posted right away.
   */
  async submitNewBiteAndAddAnother(newBite: BiteFormValue): Promise<void> {
    await this.createBite(newBite, () => {
      void this.showToast('bite-created-successfully');
    });
  }

  private async createBite(
    newBite: BiteFormValue,
    onCreated: () => void,
  ): Promise<void> {
    const loading = await this.loadingController.create({
      message: this.transloco.translate('creating-bite'),
      backdropDismiss: false,
      cssClass: 'bite-creating-loading',
    });
    await loading.present();

    const { id, ...biteData } = newBite;
    void id;
    try {
      await this.dataAccess.submitNewBite(biteData as unknown as Bite);

      this.analytics.logEvent(AnalyticsEvent.BiteCreated);

      onCreated();
    } finally {
      await loading.dismiss();
    }
  }

  submitEditedBite(editedBite: BiteFormValue): void {
    void this.dataAccess.submitEditedBite(editedBite as unknown as Bite);
    this.location.back();
  }

  setEditingBite(bite: Partial<Bite>): void {
    this.dataAccess.setEditingBite(bite);
  }

  searchGooglePlaces(searchText: string): void {
    this.dataAccess.searchGooglePlaces(searchText);
  }

  loadNearbyGooglePlaces(position: Geopoint): void {
    this.dataAccess.loadNearbyGooglePlaces(position);
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
