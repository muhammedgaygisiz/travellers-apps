import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { NgForOf, NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'kosaml-task-object',
  templateUrl: './task-object.component.html',
  styleUrls: ['./task-object.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, NgIf, NgForOf],
})
export class TaskObjectComponent {
  @Input()
  dataSource: any;

  displayedColumns?: string[] = ['taskObject', 'attributes', 'actions'];

  getColumnName(column: string) {
    console.log('#mo', column);
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
