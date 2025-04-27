import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
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

  onAddButtonClicked() {
    this.navController.navigateForward(['new-bite']);
  }
}
