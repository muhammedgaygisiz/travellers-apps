import { Component, OnInit } from '@angular/core';
import { map, Subscription, tap } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { ActivatedRoute } from '@angular/router';
import { fromUseScenarios } from '@travellers-apps/kosaml/store/feature';

@Component({
  selector: 'kosaml-use-scenario-page',
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Task Scenario</h1>
      <kosaml-scenario
        [model]="selectedUseScenario$ | async"
        (saveScenario)="onSaveScenario($event)"
        [showDeleteButton]="true"
        (deleteScenario)="onDeleteScenario($event)"
      ></kosaml-scenario>
    </kosaml-page>
  `,
  styles: [],
})
export class UseScenarioPageComponent implements OnInit {
  selectSubscription?: Subscription;

  selectedUseScenario$ = this.store.pipe(
    select(fromUseScenarios.selectSelectedUseScenario)
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.selectSubscription = this.route.params
      .pipe(
        map((params) => params['id']),
        tap((id) =>
          this.store.dispatch(fromUseScenarios.selectUseScenario({ id }))
        )
      )
      .subscribe();
  }

  // ngOnDestroy() {
  //   this.selectSubscription.unsubscribe();
  // }

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
