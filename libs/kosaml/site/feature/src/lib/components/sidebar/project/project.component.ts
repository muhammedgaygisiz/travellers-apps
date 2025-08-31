import { FlatTreeControl } from '@angular/cdk/tree';
import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  input,
} from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
  MatTreeModule,
} from '@angular/material/tree';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FileNode } from '@travellers-apps/kosaml/model/feature';

export interface FlatTreeNode {
  name: string;
  type: string;
  level: number;
  expandable: boolean;
}

@Component({
  selector: 'kosaml-project',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.scss'],
  imports: [
    MatTreeModule,
    RouterLinkActive,
    MatButtonModule,
    RouterLink,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectComponent implements OnChanges {
  readonly project = input<FileNode[] | null>([]);

  treeControl = new FlatTreeControl<FlatTreeNode>(
    (node) => node.level,
    (node) => node.expandable
  );

  treeFlattener = new MatTreeFlattener<FileNode, FlatTreeNode>(
    (node: FileNode, level: number) => ({
      level,
      name: node.name,
      type: node.type,
      expandable: !!node.children,
      link: node.link,
    }),
    (node) => node.level,
    (node) => node.expandable,
    (node) => node.children
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) {
      this.dataSource.data = changes['project'].currentValue;
      this.treeControl.expandAll();
    }
  }

  constructor() {
    this.dataSource.data = this.project() ?? [];
  }

  hasChild = (_: number, node: FlatTreeNode): boolean => node.expandable;
}
