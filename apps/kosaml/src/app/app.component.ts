import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'travellers-apps-root',
  template: `
    <kosaml-header (toggleProjectBar)="onToggleProjectBar()"></kosaml-header>
    <kosaml-body></kosaml-body>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'kosaml';

  onToggleProjectBar() {
    this.store.dispatch(SiteActions.toggleProjectBar());
  }
}
