import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'ta-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  @Input()
  enableBackButton = false;

  @Input()
  enableAddButton: boolean | null = true;

  @Output()
  public addItemClick: EventEmitter<void> = new EventEmitter();

  @Output()
  public loginClick: EventEmitter<void> = new EventEmitter();
}
