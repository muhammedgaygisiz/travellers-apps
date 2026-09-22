import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';
import { MyVisitsPage } from '../components/my-visits-page/my-visits.page';
import { MyVisitsService } from 'bite-tribe/table-order-data-access';

@Component({
  selector: 'bt-my-visits-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-my-visits-page
      class="ion-page"
      [summaries]="service.summaries()"
      [loading]="service.isLoading()"
      [failed]="service.hasFailed()"
      [empty]="service.isEmpty()"
      (openVisit)="open($event)"
      (retry)="service.load()"
    />
  `,
  imports: [MyVisitsPage],
})
export class MyVisitsContainer implements OnInit {
  readonly service = inject(MyVisitsService);
  private readonly navController = inject(NavController);

  ngOnInit(): void {
    void this.service.load();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'My Visits' });
  }

  open(visitId: string): void {
    void this.navController.navigateForward([PATH.MY_VISITS, visitId]);
  }
}
