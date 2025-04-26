import { Component, inject } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonChip, IonContent, NavController } from '@ionic/angular/standalone';
import { BiteComponent } from './components/bite/bite.component';

@Component({
  selector: 'bt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [PageComponent, IonContent, IonChip, BiteComponent],
})
export class BiteTribeHomeComponent {
  private readonly navController = inject(NavController);

  onAddButtonClicked() {
    this.navController.navigateForward(['new-bite']);
  }
}
