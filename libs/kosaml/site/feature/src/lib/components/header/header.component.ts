import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'kosaml-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  title = 'kosaml';

  isAuthenticated = input(true);

  toggleProjectBar = output();

  onToggleProjectBar() {
    this.toggleProjectBar.emit();
  }
}
