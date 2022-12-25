import { Component } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { fromEssentialUseCases } from '@travellers-apps/kosaml/store/feature';
import { ActivatedRoute } from '@angular/router';
import { map, tap } from 'rxjs';
import { ConceptualDesignUseCaseTypes } from '@travellers-apps/kosaml/conceptual-design/base/use-case/feature';

@Component({
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Essential Use Case</h1>
      <kosaml-cp-base-use-case
        [type]="type"
        [dataSource]="dataSource$"
      ></kosaml-cp-base-use-case>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
})
export class EssentialUseCasePageComponent {
  type = ConceptualDesignUseCaseTypes.ESSENTIAL;

  dataSource$ = this.store.pipe(
    select(fromEssentialUseCases.selectSelectedEssentialUseCase)
  );

  currentSelected$ = this.route.params.pipe(
    map((params) => params['id']),
    tap((id) =>
      this.store.dispatch(fromEssentialUseCases.selectEssentialUseCase({ id }))
    )
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private readonly route: ActivatedRoute
  ) {}
}
