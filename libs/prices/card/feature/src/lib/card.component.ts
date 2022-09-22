import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MostSearchedItem } from '@travellers-apps/utils-common';

@Component({
  selector: 'ta-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  @Input()
  public entry: MostSearchedItem | null = null;
}
