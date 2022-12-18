import { Component, Input } from '@angular/core';

@Component({
  selector: 'kosaml-task-object',
  templateUrl: './task-object.component.html',
  styleUrls: ['./task-object.component.scss'],
})
export class TaskObjectComponent {
  @Input()
  dataSource: any;

  displayedColumns?: string[] = ['taskObject', 'attributes', 'actions'];

  getColumnName(column: string) {
    if (column === 'taskObject') {
      return 'Task object';
    }

    if (column === 'attributes') {
      return 'Attributes';
    }

    if (column === 'actions') {
      return 'Actions';
    }

    return column;
  }
}
