import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MostSearchedItem } from '@travellers-apps/utils-common';

@Component({
  selector: 'ta-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  @Input()
  mostSearchedEntries: MostSearchedItem[] | null = [];

  @Input()
  isAuthenticated: boolean | null = false;

  @Output()
  public addItemClick: EventEmitter<void> = new EventEmitter();

  @Output()
  loginClick: EventEmitter<void> = new EventEmitter();
}
