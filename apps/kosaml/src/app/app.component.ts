import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'travellers-apps-root',
  template: `
    <kosaml-header></kosaml-header>
    <kosaml-body></kosaml-body>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'kosaml';
}
