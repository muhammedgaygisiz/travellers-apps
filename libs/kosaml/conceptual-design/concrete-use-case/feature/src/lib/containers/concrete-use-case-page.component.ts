import { ConceptualDesignUseCaseTypes } from '@travellers-apps/kosaml/conceptual-design/base/use-case/feature';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { map, tap } from 'rxjs';
import { fromConcreteUseCases } from '@travellers-apps/kosaml/store/feature';

@Component({
  template: `
    <kosaml-page>
      <h1 class="mat-display-1">Concrete Use Case</h1>
      <kosaml-cp-base-use-case
        [type]="type"
        [dataSource]="dataSource$"
      ></kosaml-cp-base-use-case>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
})
export class ConcreteUseCasePageComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  type = ConceptualDesignUseCaseTypes.CONCRETE;

  dataSource$ = this.store.pipe(
    select(fromConcreteUseCases.selectSelectedConcreteUseCase)
  );

  currentSelected$ = this.route.params.pipe(
    map((params) => params['id']),
    tap((id) =>
      this.store.dispatch(fromConcreteUseCases.selectConcreteUseCase({ id }))
    )
  );
}
