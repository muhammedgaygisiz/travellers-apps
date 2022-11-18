import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { of as observableOf } from 'rxjs';
import { FileNode } from '../../../model/filenode.model';

/**
 * Flattened tree node that has been created from a FileNode through the flattener. Flattened
 * nodes include level index and whether they can be expanded or not.
 */
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
  /** The TreeControl controls the expand/collapse state of tree nodes.  */
  treeControl: FlatTreeControl<FlatTreeNode>;

  /** The TreeFlattener is used to generate the flat list of items from hierarchical data. */
  treeFlattener?: MatTreeFlattener<FileNode, FlatTreeNode>;

  /** The MatTreeFlatDataSource connects the control and flattener to provide data. */
  dataSource?: MatTreeFlatDataSource<FileNode, FlatTreeNode>;

  @Input()
  project?: FileNode[];

  constructor() {
    // this.treeFlattener = new MatTreeFlattener(
    //   this.transformer,
    //   this.getLevel,
    //   this.isExpandable,
    //   this.getChildren,
    // );

    this.treeControl = new FlatTreeControl(this.getLevel, this.isExpandable);
    // this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  }

  // ngOnInit() {
  // this.dataSource.data = this.project;
  // this.treeControl.expandAll();
  // }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['project']) {
      // this.dataSource.data = changes['project'].currentValue;
      // this.treeControl.expandAll();
    }
  }

  /** Transform the data to something the tree can read. */
  transformer(node: FileNode, level: number) {
    return {
      level,
      name: node.name,
      type: node.type,
      expandable: !!node.children,
      link: node.link,
    };
  }

  /** Get the level of the node */
  getLevel(node: FlatTreeNode) {
    return node.level;
  }

  /** Get whether the node is expanded or not. */
  isExpandable(node: FlatTreeNode) {
    return node.expandable;
  }

  /** Get whether the node has children or not. */
  hasChild(index: number, node: FlatTreeNode) {
    return node.expandable;
  }

  /** Get the children for the node. */
  getChildren(node: FileNode) {
    return observableOf(node.children);
  }
}
