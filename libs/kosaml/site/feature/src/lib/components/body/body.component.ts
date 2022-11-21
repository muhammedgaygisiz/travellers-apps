import { Component, Input } from '@angular/core';
import { FileNode } from '@travellers-apps/kosaml/store/feature';

@Component({
  selector: 'kosaml-body',
  templateUrl: './body.component.html',
  styleUrls: ['./body.component.scss'],
})
export class BodyComponent {
  @Input()
  isAuthenticated?: boolean = true;

  @Input()
  isProjectBarOpen: boolean | null = false;

  @Input()
  isToolBarOpen?: boolean;

  @Input()
  project: FileNode[] | null = [];

  onLogout() {
    console.log('');
  }
}
