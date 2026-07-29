import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AboutPage } from '../components/about-page/about.page';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { AboutService } from './about.service';

@Component({
  selector: 'about-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <about-page
      class="ion-page"
      [totalNumberBites]="service.totalNumberBites.value()"
      [totalNumberUsers]="service.totalNumberUsers.value()"
      (openPrivacyPolicy)="service.goToPrivacyPolicy()"
    />
  `,
  imports: [AboutPage],
})
export class AboutContainerComponent {
  service = inject(AboutService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'About',
    });

    this.service.totalNumberBites.reload();
    this.service.totalNumberUsers.reload();
  }
}
