import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { DietaryLabelApprovals } from '../component/dietary-label-approvals/dietary-label-approvals';
import { DietaryLabelApprovalsService } from './dietary-label-approvals.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DietaryLabelApprovals],
  template: `
    <lib-dietary-label-approvals
      class="ion-page"
      [approvals]="service.approvals()"
      [loading]="service.loading()"
      [failed]="service.failed()"
      [answering]="service.answering()"
      (answer)="service.answer($event)"
      (reload)="service.load()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class DietaryLabelApprovalsContainer implements OnInit {
  readonly service = inject(DietaryLabelApprovalsService);

  ngOnInit(): void {
    void this.service.load();
  }
}
