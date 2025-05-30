import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BiteDirective } from './bite.directive';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'edit-bite',
  //templateUrl: './bite.page.html',
  template: `<p>It works!</p>`,
  styleUrl: './bite.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  hostDirectives: [
    {
      directive: BiteDirective,
    },
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class EditBitePage extends BiteDirective {}
