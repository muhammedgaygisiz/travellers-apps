import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import type { GlobeZoomControl } from 'bite-tribe-common/map/globe';
import { ProfileService } from './profile.service';
import {
  WorldComponent,
  type WorldCountryTap,
} from '../components/world-page/world.component';

/**
 * The world page of the profile in the route, `world/{userId}` (GitHub issue
 * #1787). Reads the same user document the profile does, so the globe shows
 * exactly the countries the profile's flags do.
 */
@Component({
  selector: 'world-container',
  template: `
    <world-page
      class="ion-page"
      [isLoading]="isLoading()"
      [displayName]="user()?.displayName"
      [isOwnProfile]="isOwnProfile()"
      [countryCodes]="user()?.countryCodes"
      [biteCounts]="biteCounts()"
      (countryTap)="onCountryTap($event)"
      (zoomed)="onZoomed($event)"
    />
  `,
  imports: [WorldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldContainer {
  private readonly service = inject(ProfileService);

  user = this.service.userValue;
  isLoading = computed(() => this.service.user.isLoading() && !this.user());
  isOwnProfile = computed(() => {
    const userId = this.user()?.userId;

    return !!userId && userId === this.service.myUser()?.userId;
  });

  /**
   * Bites per country for the list under the globe. Read once per profile;
   * a failed read leaves the list without numbers rather than without rows.
   */
  private readonly biteCountsResource = resource({
    params: () => this.user()?.userId,
    loader: ({ params }) => this.service.biteCountsByCountry(params),
  });

  biteCounts = computed(() =>
    this.biteCountsResource.hasValue()
      ? this.biteCountsResource.value()
      : undefined,
  );

  /** Ionic keeps a page alive in its stack; each entry is a new visit. */
  private readonly visit = signal(0);
  private openTrackedForVisit: number | undefined;
  private zoomTrackedForVisit: number | undefined;

  constructor() {
    // Logged once the profile is known, since whose globe it is is the one
    // thing the event says.
    effect(() => {
      const visit = this.visit();

      if (visit && this.user() && this.openTrackedForVisit !== visit) {
        this.openTrackedForVisit = visit;
        this.service.trackWorldOpened(this.isOwnProfile());
      }
    });
  }

  ionViewDidEnter(): void {
    this.visit.update((visit) => visit + 1);
    FirebaseAnalytics.setCurrentScreen({ screenName: 'World' });
  }

  onCountryTap({ countryCode, visited, source }: WorldCountryTap): void {
    this.service.trackWorldCountryTapped(countryCode, visited, source);
  }

  onZoomed(control: GlobeZoomControl): void {
    if (this.zoomTrackedForVisit !== this.visit()) {
      this.zoomTrackedForVisit = this.visit();
      this.service.trackWorldZoomed(control);
    }
  }
}
