import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

@Component({
  selector: 'ta-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  @Input()
  public entry: any;

  constructor() {}

}
