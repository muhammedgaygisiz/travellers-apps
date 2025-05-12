import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonText,
  NavController,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { BiteComponent } from '../bite/bite.component';

@Component({
  selector: 'bt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonChip,
    BiteComponent,
    IonCard,
    IonCardContent,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTribeHomeComponent {
  private readonly navController = inject(NavController);

  bites = input<any[]>();
  userId = input<string>();

  readonly logoutClick = output();

  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();

  onAddButtonClicked() {
    this.navController.navigateForward(['new-bite']);
  }

  onBiteClicked(bite: Bite) {
    this.navController.navigateForward(['bite', bite.id]);
  }

  onRestaurantClicked(bite: Bite) {
    this.navController.navigateForward([
      'restaurant',
      encodeURIComponent(bite.place),
    ]);
  }
}
