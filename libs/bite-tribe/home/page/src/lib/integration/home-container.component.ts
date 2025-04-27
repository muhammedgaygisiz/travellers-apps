import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <bt-home [bites]="service.bites()" /> `,
  imports: [BiteTribeHomeComponent],
})
export class HomeContainerComponent {
  service = inject(HomeService);
}
