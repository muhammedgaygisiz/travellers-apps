import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { BitePage } from '../components/page/bite.page';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <bite
    [currency]="service.currency()"
    [position]="service.position()"
    (submitNewBite)="service.submitNewBite($event)"
  />`,
  imports: [BitePage],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BiteContainer {
  service = inject(BiteService);
}
