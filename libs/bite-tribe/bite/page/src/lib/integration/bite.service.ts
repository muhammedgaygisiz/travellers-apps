import { Location } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { CelebrationService } from 'celebration';
import type { Bite, Geopoint } from 'model';
import type { BiteSubmission } from '../components/page/bite.page';
import { biteSourceOf, withDraftProvenance } from './bite-provenance';
import { withAddressInvalidatedIfMoved } from './bite-address';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { SoundsService } from 'sounds';
import { ToastService } from 'toast';

@Injectable({ providedIn: 'root' })
export class BiteService {
  public readonly dataAccess = inject(BiteDataAccessService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly loadingController = inject(LoadingController);
  private readonly transloco = inject(TranslocoService);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);
  private readonly celebration = inject(CelebrationService);
  private readonly sounds = inject(SoundsService);

  image = signal<string>('');

  bite = this.dataAccess.bite;

  /**
   * The Bite being edited, read through the data access guard rather than off
   * the resource: `value()` throws once a read has failed. See GitHub issue
   * #1232.
   */
  biteValue = this.dataAccess.biteValue;
  biteLoadFailed = this.dataAccess.biteLoadFailed;
  currency = this.dataAccess.currency;
  favCurrencies = this.dataAccess.favCurrencies;
  position = this.dataAccess.position;
  cachedBite = this.dataAccess.cachedBite;
  nearbyRestaurants = this.dataAccess.nearbyRestaurants;
  tagSuggestionsForEditingBite = this.dataAccess.tagSuggestionsForEditingBite;
  taggableUsers = this.dataAccess.taggableUsers;
  taggedUsers = this.dataAccess.taggedUsers;
  storedPhotoPosition = this.dataAccess.storedPhotoPosition;
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

  async submitNewBite(newBite: BiteSubmission): Promise<void> {
    await this.createBite(newBite, (first) => {
      void this.navController.navigateBack(['home']);

      this.confirmCreated(first);
    });
  }

  /**
   * Creates the Bite but keeps the user on the create form so the next Bite at
   * the same place can be posted right away. A first Bite celebrates over the
   * form.
   */
  async submitNewBiteAndAddAnother(newBite: BiteSubmission): Promise<void> {
    await this.createBite(newBite, (first) => this.confirmCreated(first));
  }

  /**
   * The user's first Bite is celebrated in place of the ordinary toast (issue
   * #1796); every later one gets the ordinary toast and the `posted` sound
   * (issue #1845). The celebration plays its own sound, so a first Bite does
   * not play `posted` as well.
   */
  private confirmCreated(first: boolean): void {
    if (first) {
      void this.celebration.celebrate('first-bite');
      return;
    }

    void this.toast.present({
      messageKey: 'bite-created-successfully',
      outcome: 'success',
    });
    void this.sounds.posted();
  }

  private async createBite(
    newBite: BiteSubmission,
    onCreated: (first: boolean) => void,
  ): Promise<void> {
    const loading = await this.loadingController.create({
      message: this.transloco.translate('creating-bite'),
      backdropDismiss: false,
      cssClass: 'bite-creating-loading',
    });
    await loading.present();

    // The photo position is taken off here and stored apart: anything left on
    // the document is readable by every member (GitHub issue #1290).
    const { id, photoPosition, ...biteData } = newBite;
    void id;

    // Read before the write: `submitNewBite` clears the draft as its first act,
    // so the provenance has to be taken off it while it is still there.
    const document = withDraftProvenance(
      biteData as unknown as Bite,
      this.cachedBite(),
    );
    const copiedFromId = this.cachedBite()?.copiedFrom?.biteId;

    // Also read before the write, which would count as one. Nothing is
    // stored: deleting the only Bite and posting again celebrates again, as
    // epic #1741 accepts. An answer that cannot be told is not taken for none.
    const first = (await this.dataAccess.hasOwnBites()) === false;

    try {
      await this.dataAccess.submitNewBite(document, photoPosition ?? undefined);

      // A copy of a bucket-listed Bite means the dish was eaten (#2018).
      if (copiedFromId) {
        this.dataAccess.markTriedOutInBucketlists(copiedFromId);
      }

      this.analytics.logEvent(AnalyticsEvent.BiteCreated, {
        source: biteSourceOf(document),
      });

      onCreated(first);
    } finally {
      await loading.dismiss();
    }
  }

  submitEditedBite(submission: BiteSubmission): void {
    // Taken off for the reason `createBite` gives (GitHub issue #1290).
    const { photoPosition, ...editedBite } = submission;
    const bite = withAddressInvalidatedIfMoved(
      editedBite as unknown as Bite,
      this.biteValue(),
    );

    void this.dataAccess.submitEditedBite(bite, photoPosition);
    this.location.back();
  }

  /** Runs a failed Bite read again, for the edit page's try-again action. */
  retryBiteLoad(): void {
    this.dataAccess.bite.reload();
  }

  /** Leaves an edit that cannot be started because the Bite never loaded. */
  goBack(): void {
    this.location.back();
  }

  setEditingBite(bite: Partial<Bite>): void {
    this.dataAccess.setEditingBite(bite);
  }

  /**
   * Drops the prefilled draft a creation session was seeded with, so it cannot
   * be inherited by the next one.
   */
  clearCachedBite(): void {
    this.dataAccess.clearCachedBite();
  }

  searchGooglePlaces(searchText: string): void {
    this.dataAccess.searchGooglePlaces(searchText);
  }

  loadNearbyGooglePlaces(position: Geopoint): void {
    this.dataAccess.loadNearbyGooglePlaces(position);
  }
}
