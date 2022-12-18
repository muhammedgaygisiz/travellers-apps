import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';

@Component({
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Task Object</h1>

      <kosaml-task-object [dataSource]="dataSource"></kosaml-task-object>
    </kosaml-page>
  `,
})
export class TaskObjectPageComponent {
  dataSource: any = [
    {
      taskObject: 'CD-ROM',
      attributes: [
        'Keywords',
        'Title',
        'Author',
        'Year',
        'Platform',
        'Owned by (academic, researcher, or research student)',
      ],
      actions: ['View', 'Add', 'Print', 'Delete', 'Save', 'Reserve', 'Edit'],
    },
  ];

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private readonly route: ActivatedRoute
  ) {}
}
