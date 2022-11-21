import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { FileNode } from '@travellers-apps/kosaml/store/feature';

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
})
export class ProjectComponent implements OnChanges {
  @Input()
  project: FileNode[] | null = [];

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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['project']) {
      this.dataSource.data = changes['project'].currentValue;
    }
  }

  constructor() {
    this.dataSource.data = this.project ?? [];
  }

  hasChild = (_: number, node: FlatTreeNode) => node.expandable;
}
