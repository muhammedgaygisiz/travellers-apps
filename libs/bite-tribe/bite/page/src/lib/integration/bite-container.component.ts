import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { BitePage } from '../components/page/bite.page';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <bt-bite
    [currency]="service.currency()"
    [position]="service.position()"
    (submitNewBite)="service.submitNewBite($event)"
  />`,
  imports: [BitePage],
})
export class BiteContainerComponent {
  service = inject(BiteService);
}
