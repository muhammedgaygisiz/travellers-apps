import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatLegacyCardModule } from '@angular/material/legacy-card';

@Component({
  standalone: true,
  selector: 'kosaml-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [CommonModule, MatLegacyCardModule],
})
export class CardComponent {
  @Input()
  showSaveButton?: boolean;
}
