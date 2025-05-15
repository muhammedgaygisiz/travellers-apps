import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent, IonImg } from '@ionic/angular/standalone';
import { Bite, Menu, MenuItem, Restaurant } from 'model';
import { ToMetricPipe } from 'distance-pipe';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: './restaurant.component.scss',
  imports: [PageComponent, IonContent, IonImg, IonButton, ToMetricPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {
  bite = input<Bite>();
  restaurant = input<Restaurant>();
  menu = input<Menu>({
    categories: [
      {
        title: 'Pizza',
        subtitle:
          'alle Pizzen mit Gouda-Käse, Tomatensauce und Oregano. ca. 32cm',
        items: [
          {
            name: 'Margherita',
            description: 'Tomatensauce & Käse',
            price: 7,
          },
          {
            name: 'Salami',
            description: 'Salami (Rind)',
            price: 8.5,
          },
          {
            name: 'Prosciutto',
            description: 'Putenschinken',
            price: 8.5,
          },
          {
            name: 'Funghi',
            description: 'frische Champignons',
            price: 8,
          },
          {
            name: 'Quattro Formaggi',
            description: 'vier Käsesorten',
            price: 8.5,
          },
          {
            name: 'Tonno Cipolla',
            description: 'Thunfisch & rote Zwiebeln',
            price: 10,
          },
        ],
      },
      {
        title: 'Vorspeisen',
        subtitle: 'Panini (gefüllte Pizzabrötchen je 6 Stück)',
        items: [
          {
            name: 'Panini Käse',
            description: 'mit Käse gefüllt',
            price: 6,
          },
          {
            name: 'Panini Tonno',
            description: 'mit Thunfisch und Käse gefüllt',
            price: 7,
          },
          {
            name: 'Panini Prosciutto',
            description: 'mit Putenschinken gefüllt',
            price: 7,
          },
          {
            name: 'Panini Feta',
            description: 'mit Fetakäse und Blattspinat gefüllt',
            price: 7,
          },
          {
            name: 'Pizzabrötchen',
            description:
              'wahlweise mit Kräuterbutter, Aioli (c.g.m) Kräuterbutter',
            price: 3,
          },
        ],
      },
      {
        title: 'Salate',
        items: [
          {
            name: 'Capricciosa Salat',
            description:
              'mit Eisbergsalat, Tomate, Gurken, Thunfisch, Oliven, Ei, Schinken, Käse',
            price: 10.9,
          },
        ],
      },
      {
        title: 'Vegetarische Spezialitäten',
        items: [
          {
            name: 'Gebratener Reis',
            description: 'mit frischem Gemüse',
            price: 7.9,
          },
          {
            name: 'Gebratener Reis',
            description: 'mit frischem Gemüse & Tofu',
            price: 8.9,
          },
        ],
      },
    ],
  });

  createBiteClick = output<MenuItem>();

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.name || bite?.place;
  });

  placeDistance = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    const restaurantDistance = restaurant?.distance;
    if (restaurantDistance && restaurantDistance !== 'NaN') {
      return restaurantDistance;
    }

    return bite?.distance;
  });
}
