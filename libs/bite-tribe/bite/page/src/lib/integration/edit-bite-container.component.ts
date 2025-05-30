import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EditBitePage } from '../components/page/edit-bite.page';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <edit-bite />`,
  imports: [EditBitePage],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class EditBiteContainer {}
