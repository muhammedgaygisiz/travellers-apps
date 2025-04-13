import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContentComponent } from '../content/content.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MenuBarComponent } from '../menu-bar/menu-bar.component';
import { FileNode } from '@travellers-apps/kosaml/model/feature';

@Component({
  selector: 'kosaml-body',
  templateUrl: './body.component.html',
  styleUrls: ['./body.component.scss'],
  imports: [ContentComponent, SidebarComponent, MenuBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BodyComponent {
  readonly isAuthenticated = input<boolean | undefined>(true);

  readonly project = input<FileNode[] | null>([]);
}
