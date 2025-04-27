import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTribeBiteComponent } from '../components/page/bite.component';
import { BiteService } from './bite.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <bt-bite (submitNewBite)="service.submitNewBite($event)" />`,
  imports: [BiteTribeBiteComponent],
})
export class BiteContainerComponent {
  service = inject(BiteService);
}
