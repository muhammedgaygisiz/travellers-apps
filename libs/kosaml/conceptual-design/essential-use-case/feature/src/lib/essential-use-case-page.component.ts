import { Component, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { fromEssentialUseCases } from '@travellers-apps/kosaml/store/feature';
import { ActivatedRoute } from '@angular/router';
import { map, tap } from 'rxjs';
import {
  ConceptualDesignUseCaseTypes,
  CpBaseUseCaseComponent,
} from '@travellers-apps/kosaml/conceptual-design/base/use-case/feature';
import { CommonModule } from '@angular/common';
import { PageComponent } from '@travellers-apps/kosaml/page/feature';
import { MatTableModule } from '@angular/material/table';

@Component({
  standalone: true,
  template: `
    <kosaml-page>
      <h1 class="mat-headline-4">Essential Use Case</h1>
      <kosaml-cp-base-use-case
        [type]="type"
        [dataSource]="dataSource$"
      ></kosaml-cp-base-use-case>
    </kosaml-page>
    <ng-container *ngIf="currentSelected$ | async"></ng-container>
  `,
  imports: [
    CommonModule,
    PageComponent,
    MatTableModule,
    CpBaseUseCaseComponent,
  ],
})
export class EssentialUseCasePageComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

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
}
