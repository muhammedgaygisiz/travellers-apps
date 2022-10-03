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
  isAuthenticated: boolean | null = false;

  @Input()
  hideAuthButton = false;

  @Output()
  public addItemClick: EventEmitter<void> = new EventEmitter();

  @Output()
  public loginClick: EventEmitter<void> = new EventEmitter();

  @Output()
  public logoutClick: EventEmitter<void> = new EventEmitter();
}
