import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { FileNode } from '@travellers-apps/kosaml/store/feature';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ProjectComponent } from './project/project.component';

@Component({
  standalone: true,
  selector: 'kosaml-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [MatSidenavModule, MatToolbarModule, ProjectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  @Input()
  project: FileNode[] | null = [];

  @Input()
  marginTop: number = 40 + 36;

  @ViewChild('sidenav', { static: true, read: ElementRef })
  matSideNav?: ElementRef;
}
