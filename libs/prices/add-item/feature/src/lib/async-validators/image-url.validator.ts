import { Injectable } from '@angular/core';
import {
  AbstractControl,
  AsyncValidator,
  ValidationErrors,
} from '@angular/forms';
import { map, Observable } from 'rxjs';
import { fromFetch } from 'rxjs/internal/observable/dom/fetch';

@Injectable()
export class ImageUrlValidator implements AsyncValidator {
  validate(
    control: AbstractControl
  ): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return fromFetch(control.getRawValue()).pipe(
      map((response) =>
        !response.ok ? { errorOnLoad: { value: control.value } } : null
      )
    );
  }
}
