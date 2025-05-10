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
import { BitePage } from '../bite/bite-page.component';
import { Bite } from 'model';

@Component({
  selector: 'bt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonChip,
    BitePage,
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
  currentPosition = input();

  readonly logoutClick = output();

  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();

  onAddButtonClicked() {
    this.navController.navigateForward(['new-bite']);
  }

  onBiteClicked(bite: Bite) {
    this.navController.navigateForward(['bite', bite.id]);
  }
}
