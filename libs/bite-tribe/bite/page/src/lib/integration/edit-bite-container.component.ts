import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BitePage } from '../components/page/bite.page';
import { BiteService } from './bite.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bite
      [bite]="service.bite()"
      (submitBite)="service.submitEditedBite($event)"
    />
  `,
  imports: [BitePage],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class EditBiteContainer {
  service = inject(BiteService);
}
