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

  readonly logoutClick = output();

  onAddButtonClicked() {
    this.navController.navigateForward(['new-bite']);
  }

  onBiteClick(bite: Bite) {
    this.navController.navigateForward(['bite', bite.id]);
  }
}
