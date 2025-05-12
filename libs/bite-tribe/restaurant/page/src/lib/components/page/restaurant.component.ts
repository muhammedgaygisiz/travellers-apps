import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageComponent } from 'common/ui/page';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: './restaurant.component.scss',
  imports: [PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {}
