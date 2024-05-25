import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ChangeDetectorRef,
  OnDestroy,
  Pipe,
  PipeTransform,
} from '@angular/core';

@Pipe({
  name: 'translate',
  pure: false,
  standalone: true,
})
export class TranslatePipe
  extends TranslocoPipe
  implements PipeTransform, OnDestroy
{
  constructor(translocoService: TranslocoService, cdr: ChangeDetectorRef) {
    super(translocoService, undefined, undefined, cdr);
  }
}
