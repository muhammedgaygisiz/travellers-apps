import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  selector: 'kosaml-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [MatCardModule],
})
export class CardComponent {
  @Input()
  showSaveButton?: boolean;
}
