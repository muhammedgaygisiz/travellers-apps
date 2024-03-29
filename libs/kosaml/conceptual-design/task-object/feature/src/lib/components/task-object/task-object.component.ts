import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

@Component({
  standalone: true,
  selector: 'kosaml-task-object',
  templateUrl: './task-object.component.html',
  styleUrls: ['./task-object.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule],
})
export class TaskObjectComponent {
  @Input()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
