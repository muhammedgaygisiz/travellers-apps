import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonCard, IonImg, IonSkeletonText } from '@ionic/angular/standalone';
import { Restaurant } from 'model';

@Component({
  selector: 'bt-restaurant-image',
  templateUrl: './restaurant-image.component.html',
  styleUrl: './restaurant-image.component.scss',
  imports: [IonImg, IonSkeletonText, IonCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantImageComponent {
  restaurant = input<Restaurant>();
}
