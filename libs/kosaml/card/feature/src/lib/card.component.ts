import { Component, Input } from '@angular/core';

@Component({
  selector: 'kosaml-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent {
  @Input()
  showSaveButton?: boolean;
}
