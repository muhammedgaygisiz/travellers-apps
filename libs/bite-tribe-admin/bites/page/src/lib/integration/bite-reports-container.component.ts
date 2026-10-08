import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { BiteReportsComponent } from '../component/bite-reports.component';
import { BiteReportsService } from './bite-reports.service';

@Component({
  template: `<lib-bite-reports
    class="ion-page"
    [reports]="service.reports()"
    [loading]="service.loading()"
    [loaded]="service.loaded()"
    [failed]="service.failed()"
    [truncated]="service.truncated()"
    [selected]="service.selected()"
    [authorBlocked]="service.selectedAuthorBlocked()"
    [action]="service.action()"
    (reload)="service.load()"
    (selectBite)="service.select($event)"
    (deleteBite)="service.deleteBite($event.biteId, $event.reason)"
    (dismissReports)="service.dismiss($event.biteId, $event.reason)"
    (blockAuthor)="service.blockAuthor($event)"
    (logoutClick)="service.logout()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BiteReportsComponent],
})
export class BiteReportsContainer implements OnInit {
  readonly service = inject(BiteReportsService);

  /** The queue is read on every visit: it is the thing that changes. */
  ngOnInit(): void {
    void this.service.load();
  }
}
