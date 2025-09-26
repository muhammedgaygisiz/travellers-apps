import { Component, input } from '@angular/core';
import { IonIcon, IonImg } from '@ionic/angular/standalone';
import { Restaurant } from 'model';

@Component({
  selector: 'bt-restaurant-image',
  templateUrl: './restaurant-image.component.html',
  styleUrl: './restaurant-image.component.scss',
  imports: [IonImg, IonIcon],
})
export class RestaurantImageComponent {
  restaurant = input<Restaurant>();
}
