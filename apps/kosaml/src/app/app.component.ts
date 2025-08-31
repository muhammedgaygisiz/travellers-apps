import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';

import { AsyncPipe } from '@angular/common';
import {
  BodyComponent,
  fromSite,
  HeaderComponent,
} from '@travellers-apps/kosaml/shell/feature';

@Component({
  selector: 'travellers-apps-root',
  template: `
    <kosaml-header (toggleProjectBar)="onToggleProjectBar()" />
    <kosaml-body [project]="project$ | async" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeaderComponent, BodyComponent, AsyncPipe],
})
export class AppComponent {
  private readonly store = inject(Store);
  title = 'kosaml';

  project$ = this.store.pipe(select(fromSite.selectProjectStructure));

  onToggleProjectBar(): void {
    this.store.dispatch(fromSite.toggleProjectBar());
  }
}
