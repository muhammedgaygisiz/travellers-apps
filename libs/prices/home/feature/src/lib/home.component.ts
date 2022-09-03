import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

@Component({
  selector: 'ta-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {

  @Input()
  mostSearchedEntries: {}[] | null = [];
}
