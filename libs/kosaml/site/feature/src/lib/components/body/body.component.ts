import { Component, Input } from '@angular/core';
import { FileNode } from '../../model/filenode.model';

@Component({
  selector: 'kosaml-body',
  templateUrl: './body.component.html',
  styleUrls: ['./body.component.scss'],
})
export class BodyComponent {
  @Input()
  isAuthenticated?: boolean = true;

  @Input()
  isProjectBarOpen?: boolean;

  @Input()
  isToolBarOpen?: boolean;

  @Input()
  project?: FileNode[];

  onLogout() {
    console.log('');
  }
}
