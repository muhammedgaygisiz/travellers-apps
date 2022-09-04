import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {MostSearchedItem} from "../store/model";

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
