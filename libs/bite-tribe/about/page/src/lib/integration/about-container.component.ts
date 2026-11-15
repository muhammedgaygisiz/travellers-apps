import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { AboutPage } from '../components/about-page/about.page';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { AboutService } from './about.service';

@Component({
  selector: 'about-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <about-page
      class="ion-page"
      [totalNumberBites]="service.totalNumberBitesValue()"
      [totalNumberUsers]="service.totalNumberUsersValue()"
      [biteCountryCodes]="service.biteCountriesValue()"
      [loading]="service.loading()"
      (openPrivacyPolicy)="service.goToPrivacyPolicy()"
    />
  `,
  imports: [AboutPage],
})
export class AboutContainerComponent implements OnInit {
  service = inject(AboutService);

  // The counts live in a root service, so they outlive the page. Every entry
  // refreshes them: on creation, because Ionic does not reliably raise the
  // view lifecycle events for this page on re-entry, and on ionViewWillEnter
  // for a cached view it shows again. Before GitHub issue #2072 the refresh
  // ran only in ionViewDidEnter, and the user count stayed stale.
  ngOnInit(): void {
    this.service.reloadCounts();
  }

  ionViewWillEnter(): void {
    this.service.reloadCounts();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'About',
    });
  }
}
