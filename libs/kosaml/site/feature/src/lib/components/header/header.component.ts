import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgIf, UpperCasePipe } from '@angular/common';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'kosaml-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    MatToolbarModule,
    NgIf,
    MatButtonModule,
    MatIconModule,
    UpperCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  title = 'kosaml';

  @Input()
  isAuthenticated = true;

  @Output()
  toggleProjectBar = new EventEmitter();

  onToggleProjectBar() {
    this.toggleProjectBar.emit();
  }
}
