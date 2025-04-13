import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'kosaml-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [MatCardModule],
})
export class CardComponent {
  readonly showSaveButton = input<boolean>();
}
