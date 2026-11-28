import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { DietaryLabelRemovals } from '../component/dietary-label-removals/dietary-label-removals';
import { DietaryLabelRemovalsService } from './dietary-label-removals.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DietaryLabelRemovals],
  template: `
    <lib-dietary-label-removals
      class="ion-page"
      [removals]="service.removals()"
      [loading]="service.loading()"
      [failed]="service.failed()"
      [answering]="service.answering()"
      (answer)="service.answer($event)"
      (reload)="service.load()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class DietaryLabelRemovalsContainer implements OnInit {
  readonly service = inject(DietaryLabelRemovalsService);

  ngOnInit(): void {
    void this.service.load();
  }
}
