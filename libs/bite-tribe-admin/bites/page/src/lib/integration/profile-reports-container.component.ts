import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ProfileReportsComponent } from '../component/profile-reports.component';
import { ProfileReportsService } from './profile-reports.service';

@Component({
  template: `<lib-profile-reports
    class="ion-page"
    [reports]="service.reports()"
    [loading]="service.loading()"
    [loaded]="service.loaded()"
    [failed]="service.failed()"
    [truncated]="service.truncated()"
    [selected]="service.selected()"
    [action]="service.action()"
    (reload)="service.load()"
    (selectProfile)="service.select($event)"
    (blockAccount)="service.blockAccount($event)"
    (dismissReports)="service.dismiss($event.uid, $event.reason)"
    (logoutClick)="service.logout()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfileReportsComponent],
})
export class ProfileReportsContainer implements OnInit {
  readonly service = inject(ProfileReportsService);

  /** The queue is read on every visit: it is the thing that changes. */
  ngOnInit(): void {
    void this.service.load();
  }
}
