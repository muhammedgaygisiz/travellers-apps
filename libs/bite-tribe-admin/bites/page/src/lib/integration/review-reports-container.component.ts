import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ReviewReportsComponent } from '../component/review-reports.component';
import { ReviewReportsService } from './review-reports.service';

@Component({
  template: `<lib-review-reports
    class="ion-page"
    [reports]="service.reports()"
    [loading]="service.loading()"
    [loaded]="service.loaded()"
    [failed]="service.failed()"
    [truncated]="service.truncated()"
    [selected]="service.selected()"
    [action]="service.action()"
    [blockedAuthors]="service.blockedAuthors()"
    (reload)="service.load()"
    (selectReview)="service.select($event)"
    (blockAuthor)="service.blockAuthor($event)"
    (dismissReports)="service.dismiss($event.reviewId, $event.reason)"
    (logoutClick)="service.logout()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReviewReportsComponent],
})
export class ReviewReportsContainer implements OnInit {
  readonly service = inject(ReviewReportsService);

  /** The queue is read on every visit: it is the thing that changes. */
  ngOnInit(): void {
    void this.service.load();
  }
}
