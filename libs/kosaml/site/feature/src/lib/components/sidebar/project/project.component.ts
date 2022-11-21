import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { FileNode } from '@travellers-apps/kosaml/store/feature';
import { DataSource } from '@angular/cdk/collections';
import { Observable } from 'rxjs';

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
  treeControl: FlatTreeControl<FlatTreeNode> = new FlatTreeControl(
    this.getLevel,
    this.isExpandable
  );

  /** The TreeFlattener is used to generate the flat list of items from hierarchical data. */
  treeFlattener: MatTreeFlattener<FileNode, FlatTreeNode> =
    new MatTreeFlattener<FileNode, FlatTreeNode>(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );

  /** The MatTreeFlatDataSource connects the control and flattener to provide data. */
  dataSource:
    | DataSource<FlatTreeNode>
    | FlatTreeNode[]
    | Observable<FlatTreeNode[]> = new MatTreeFlatDataSource(
    this.treeControl,
    this.treeFlattener
  );

  @Input()
  project: FileNode[] | null = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['project']) {
      const data = changes['project'].currentValue;
      this.dataSource = data;
      this.treeControl.dataNodes = data;

      this.treeControl.expandAll();
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
  hasChild(index: number, node: FileNode) {
    return !!node.children;
  }

  /** Get the children for the node. */
  getChildren(node: FileNode) {
    return node.children;
  }
}
