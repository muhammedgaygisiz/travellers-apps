import { computed, inject, Injectable } from '@angular/core';
import { AboutDataAccessService } from 'bite-tribe/about-data-access';
import { NavController } from '@ionic/angular';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class AboutService {
  dataAccess = inject(AboutDataAccessService);
  private readonly navController = inject(NavController);

  totalNumberBites = this.dataAccess.totalNumberBites;
  totalNumberUsers = this.dataAccess.totalNumberUsers;

  /** Read guarded: `value()` throws once a read has failed (#1232). */
  totalNumberBitesValue = this.dataAccess.totalNumberBitesValue;
  totalNumberUsersValue = this.dataAccess.totalNumberUsersValue;
  biteCountriesValue = this.dataAccess.biteCountriesValue;

  /**
   * Either count is being read: the first load, or the refresh every entry
   * starts. Drives the header bar and, while a count has no value yet, its
   * skeleton (GitHub issue #2072).
   */
  readonly loading = computed(
    () =>
      this.totalNumberBites.isLoading() || this.totalNumberUsers.isLoading(),
  );

  /**
   * Re-reads both counts, so a re-entered page does not keep stale ones. A
   * count already being read is left alone: `reload()` on a reloading resource
   * starts a second request.
   */
  reloadCounts(): void {
    for (const count of [this.totalNumberBites, this.totalNumberUsers]) {
      if (!count.isLoading()) {
        count.reload();
      }
    }
  }

  goToPrivacyPolicy(): void {
    void this.navController.navigateForward([PATH.PRIVACY_POLICY]);
  }
}
