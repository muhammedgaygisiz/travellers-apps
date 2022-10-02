import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  template: ` <ta-auth class="ion-page"></ta-auth> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthContainerComponent {}
