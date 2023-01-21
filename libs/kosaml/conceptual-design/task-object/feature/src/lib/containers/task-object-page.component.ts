import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { fromTaskObjects } from '@travellers-apps/kosaml/store/feature';
import { select, Store } from '@ngrx/store';
import { map, tap } from 'rxjs';

@Component({
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Task Object</h1>

      <kosaml-task-object
        [dataSource]="dataSource$ | async"
      ></kosaml-task-object>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
})
export class TaskObjectPageComponent {
  dataSource$ = this.store.pipe(
    select(fromTaskObjects.selectSelectedTaskObject),
    tap((res) => console.log('#mo', res))
  );

  currentSelected$ = this.route.params.pipe(
    map((params) => params['id']),
    tap((id) => this.store.dispatch(fromTaskObjects.selectTaskObject({ id })))
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private readonly route: ActivatedRoute
  ) {}
}
