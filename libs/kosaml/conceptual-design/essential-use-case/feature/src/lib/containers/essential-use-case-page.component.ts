import { Component } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { fromEssentialUseCases } from '@travellers-apps/kosaml/store/feature';
import { ActivatedRoute } from '@angular/router';
import { map, tap } from 'rxjs';

@Component({
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Essential Use Case</h1>
      <kosaml-essential-use-case
        [dataSource]="dataSource$"
      ></kosaml-essential-use-case>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
})
export class EssentialUseCasePageComponent {
  dataSource$ = this.store.pipe(
    select(fromEssentialUseCases.selectSelectedEssentialUseCase)
  );

  currentSelected$ = this.route.params.pipe(
    map((params) => params['id']),
    tap((id) =>
      this.store.dispatch(
        fromEssentialUseCases.selectEssentialUseScenario({ id })
      )
    )
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private readonly route: ActivatedRoute
  ) {}
}
