import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {MostSearchedItem} from "@travellers-apps/prices/store/feature";

@Component({
  selector: 'ta-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {

  @Input()
  mostSearchedEntries: MostSearchedItem[] | null = [];
}
