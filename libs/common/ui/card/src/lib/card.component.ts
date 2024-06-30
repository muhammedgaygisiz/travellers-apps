import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonCard } from '@ionic/angular/standalone';

@Component({
  standalone: true,
  selector: 'ta-card',
  templateUrl: './card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCard],
})
export class CardComponent {}
