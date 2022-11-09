import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'travellers-apps-root',
  template: '<p>Works!</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'kosaml';
}
