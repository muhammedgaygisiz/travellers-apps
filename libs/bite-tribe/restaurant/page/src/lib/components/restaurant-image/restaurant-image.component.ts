import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonImg, IonSkeletonText } from '@ionic/angular/standalone';
import { Restaurant } from 'model';

@Component({
  selector: 'bt-restaurant-image',
  templateUrl: './restaurant-image.component.html',
  styleUrl: './restaurant-image.component.scss',
  imports: [IonImg, IonSkeletonText],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantImageComponent {
  restaurant = input<Restaurant>();
}
