import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { fromSite } from '@travellers-apps/kosaml/store/feature';
import {
  BodyComponent,
  HeaderComponent,
} from '@travellers-apps/kosaml/site/feature';
import { AsyncPipe } from '@angular/common';

@Component({
  standalone: true,
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

  onToggleProjectBar() {
    this.store.dispatch(fromSite.toggleProjectBar());
  }
}
