import { ChangeDetectionStrategy, Component } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { fromSite } from '@travellers-apps/kosaml/store/feature';

@Component({
  selector: 'travellers-apps-root',
  template: `
    <kosaml-header (toggleProjectBar)="onToggleProjectBar()"></kosaml-header>
    <kosaml-body
      [isProjectBarOpen]="isProjectBarOpen$ | async"
      [project]="project$ | async"
    ></kosaml-body>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'kosaml';

  isProjectBarOpen$ = this.store.pipe(select(fromSite.selectIsProjectBarOpen));

  project$ = this.store.pipe(select(fromSite.selectProjectStructure));

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store
  ) {}

  onToggleProjectBar() {
    this.store.dispatch(fromSite.toggleProjectBar());
  }
}
