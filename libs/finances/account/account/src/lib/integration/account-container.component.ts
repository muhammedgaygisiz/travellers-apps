import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <p>hello world</p> `,
})
export class AccountContainerComponent {}
