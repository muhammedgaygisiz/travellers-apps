import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { BitePage } from '../components/page/bite.page';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <bite
    class="ion-page"
    [currency]="service.currency()"
    [position]="service.position()"
    (submitBite)="service.submitNewBite($event)"
  />`,
  imports: [BitePage],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BiteContainer {
  service = inject(BiteService);
}
