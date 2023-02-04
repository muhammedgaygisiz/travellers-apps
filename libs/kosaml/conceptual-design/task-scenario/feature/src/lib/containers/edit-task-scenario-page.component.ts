import { Component, inject } from '@angular/core';
import { map, tap } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { fromTaskScenarios } from '@travellers-apps/kosaml/store/feature';
import { ActivatedRoute } from '@angular/router';
import { PageComponent } from '@travellers-apps/kosaml/page/feature';
import { ScenarioComponent } from '@travellers-apps/kosaml/conceptual-design/base/scenario/feature';
import { AsyncPipe, NgIf } from '@angular/common';
import { Scenario } from '@travellers-apps/kosaml/model/feature';

@Component({
  standalone: true,
  template: `
    <kosaml-page>
      <h1 class="mat-headline-4">Task Scenario</h1>
      <kosaml-scenario
        [model]="selectedTaskScenario$ | async"
        (saveScenario)="onSaveScenario($event)"
        [showDeleteButton]="true"
        (deleteScenario)="onDeleteScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
  imports: [PageComponent, ScenarioComponent, AsyncPipe, NgIf],
})
export class EditTaskScenarioPageComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  selectedTaskScenario$ = this.store.pipe(
    select(fromTaskScenarios.selectSelectedTaskScenario)
  );

  currentSelected$ = this.route.params.pipe(
    map((params) => params['id']),
    tap((id) =>
      this.store.dispatch(fromTaskScenarios.selectTaskScenario({ id }))
    )
  );

  onSaveScenario(scenario: Scenario) {
    console.log(scenario);
    // this.store.dispatch(TaskScenarioActions.addTaskScenario({ taskScenario: scenario }));

    // this.router.navigate(['./project']);
  }

  onDeleteScenario(id: string) {
    console.log(id);

    //this.store.dispatch(TaskScenarioActions.deleteTaskScenario({ id }));
    //
    //this.router.navigate(['..'], { relativeTo: this.route });
  }
}
