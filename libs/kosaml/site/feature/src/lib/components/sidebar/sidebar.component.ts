import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
} from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ProjectComponent } from './project/project.component';
import { FileNode } from '@travellers-apps/kosaml/model/feature';

@Component({
  selector: 'kosaml-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [MatSidenavModule, MatToolbarModule, ProjectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly project = input<FileNode[] | null>([]);

  readonly marginTop = input<number>(40 + 36);

  @ViewChild('sidenav', { static: true, read: ElementRef })
  matSideNav?: ElementRef;
}
