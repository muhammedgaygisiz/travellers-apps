import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FileNode } from '@travellers-apps/kosaml/store/feature';
import { ContentComponent } from '../content/content.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MenuBarComponent } from '../menu-bar/menu-bar.component';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'kosaml-body',
  templateUrl: './body.component.html',
  styleUrls: ['./body.component.scss'],
  imports: [ContentComponent, SidebarComponent, MenuBarComponent, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BodyComponent {
  @Input()
  isAuthenticated?: boolean = true;

  @Input()
  project: FileNode[] | null = [];
}
