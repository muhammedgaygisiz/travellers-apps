import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FileNode } from '@travellers-apps/kosaml/store/feature';

@Component({
  selector: 'kosaml-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Input()
  project: FileNode[] | null = [];

  @Input()
  marginTop: number = 40 + 36;

  @ViewChild('sidenav', { static: true, read: ElementRef })
  matSideNav?: ElementRef;
}
