import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CreateBiteTrailService } from './create-bite-trail.service';
import { CreateBiteTrailComponent } from '../components/page/create-bite-trail.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <create-bite-trail-page
      class="ion-page"
      [bites]="service.bitesValue()"
      [owner]="service.ownerValue()"
      (submitTrail)="service.submitBiteTrail($event)"
    />
  `,
  imports: [CreateBiteTrailComponent],
})
export class CreateBiteTrailContainer {
  service = inject(CreateBiteTrailService);
}
