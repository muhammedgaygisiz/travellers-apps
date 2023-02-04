import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { map, tap } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { fromUseScenarios } from '@travellers-apps/kosaml/store/feature';
import { ActivatedRoute } from '@angular/router';
import { PageComponent } from '@travellers-apps/kosaml/page/feature';
import { ScenarioComponent } from '@travellers-apps/kosaml/conceptual-design/base/scenario/feature';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  standalone: true,
  template: `
    <kosaml-page>
      <h1 class="mat-headline-4">Use Scenario</h1>
      <kosaml-scenario
        [model]="selectedUseScenario$ | async"
        [showDeleteButton]="true"
        (saveScenario)="onSaveScenario($event)"
        (deleteScenario)="onDeleteScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
  imports: [PageComponent, ScenarioComponent, AsyncPipe, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UseScenarioPageComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  selectedUseScenario$ = this.store.pipe(
    select(fromUseScenarios.selectSelectedUseScenario)
  );

  currentSelected$ = this.route.params.pipe(
    map((params) => params['id']),
    tap((id) => this.store.dispatch(fromUseScenarios.selectUseScenario({ id })))
  );

  onSaveScenario(scenario: any) {
    console.log(scenario);
    // this.store.dispatch(UseScenarioActions.addUseScenario({ useScenario: scenario }));

    // this.router.navigate(['./project']);
  }

  onDeleteScenario(id: any) {
    console.log(id);

    //this.store.dispatch(UseScenarioActions.deleteUseScenario({ id }));
    //
    //this.router.navigate(['..'], { relativeTo: this.route });
  }
}
