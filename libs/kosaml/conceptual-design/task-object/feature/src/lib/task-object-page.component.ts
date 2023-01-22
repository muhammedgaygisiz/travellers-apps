import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { fromTaskObjects } from '@travellers-apps/kosaml/store/feature';
import { select, Store } from '@ngrx/store';
import { map, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { PageComponent } from '@travellers-apps/kosaml/page/feature';
import { TaskObjectComponent } from './components/task-object/task-object.component';

@Component({
  standalone: true,
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Task Object</h1>

      <kosaml-task-object
        [dataSource]="dataSource$ | async"
      ></kosaml-task-object>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
  imports: [CommonModule, PageComponent, TaskObjectComponent],
})
export class TaskObjectPageComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  dataSource$ = this.store.pipe(
    select(fromTaskObjects.selectSelectedTaskObject),
    tap((res) => console.log('#mo', res))
  );

  currentSelected$ = this.route.params.pipe(
    map((params) => params['id']),
    tap((id) => this.store.dispatch(fromTaskObjects.selectTaskObject({ id })))
  );
}
