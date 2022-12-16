import { Component } from '@angular/core';
import { map, Subscription, tap } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { fromTaskScenarios } from '@travellers-apps/kosaml/store/feature';
import { ActivatedRoute } from '@angular/router';

@Component({
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Task Scenario</h1>
      <kosaml-scenario
        [model]="selectedTaskScenario$ | async"
        (saveScenario)="onSaveScenario($event)"
        [showDeleteButton]="true"
        (deleteScenario)="onDeleteScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
  styles: [],
})
export class EditTaskScenarioPageComponent {
  selectSubscription?: Subscription;

  selectedTaskScenario$ = this.store.pipe(
    select(fromTaskScenarios.selectSelectedTaskScenario)
  );

  currentSelected$ = this.route.params.pipe(
    map((params) => params['id']),
    tap((id) =>
      this.store.dispatch(fromTaskScenarios.selectTaskScenario({ id }))
    )
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private readonly route: ActivatedRoute
  ) {}

  onSaveScenario(scenario: any) {
    console.log(scenario);
    // this.store.dispatch(TaskScenarioActions.addTaskScenario({ taskScenario: scenario }));

    // this.router.navigate(['./project']);
  }

  onDeleteScenario(id: any) {
    console.log(id);

    //this.store.dispatch(TaskScenarioActions.deleteTaskScenario({ id }));
    //
    //this.router.navigate(['..'], { relativeTo: this.route });
  }
}
