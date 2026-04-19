import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon, IonImg, IonSkeletonText } from '@ionic/angular/standalone';
import { Restaurant } from 'model';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bt-restaurant-image',
  templateUrl: './restaurant-image.component.html',
  styleUrl: './restaurant-image.component.scss',
  imports: [IonImg, IonIcon, TranslocoPipe, IonSkeletonText],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantImageComponent {
  restaurant = input<Restaurant>();

  darkTheme = input<boolean>(false);
}
