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
  project: FileNode[] | null = [];
}
