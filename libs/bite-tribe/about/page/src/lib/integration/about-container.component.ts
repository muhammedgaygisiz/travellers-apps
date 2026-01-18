import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'about-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>It works!</p>`,
})
export class AboutContainerComponent {}
