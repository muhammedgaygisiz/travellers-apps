import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'kosaml-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss'],
  imports: [MatToolbarModule, MatMenuModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuBarComponent {}
