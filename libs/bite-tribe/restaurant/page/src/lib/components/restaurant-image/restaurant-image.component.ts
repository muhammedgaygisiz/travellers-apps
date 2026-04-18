import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IonIcon, IonImg } from '@ionic/angular/standalone';
import { Restaurant } from 'model';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bt-restaurant-image',
  templateUrl: './restaurant-image.component.html',
  styleUrl: './restaurant-image.component.scss',
  imports: [IonImg, IonIcon, NgxSkeletonLoaderComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantImageComponent {
  restaurant = input<Restaurant>();

  darkTheme = input<boolean>(false);

  skeletonAnimation = computed((): 'pulse-dark' | 'pulse' => {
    const isDark = this.darkTheme();
    return isDark ? 'pulse-dark' : 'pulse';
  });
}
