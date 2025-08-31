import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'kosaml-task-object',
  templateUrl: './task-object.component.html',
  styleUrls: ['./task-object.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule],
})
export class TaskObjectComponent {
  readonly dataSource = input<any>();

  displayedColumns?: string[] = ['taskObject', 'attributes', 'actions'];

  getColumnName(column: string): string {
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
