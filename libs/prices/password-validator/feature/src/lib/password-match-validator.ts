import { AbstractControl, ValidationErrors } from '@angular/forms';

const passwordMatchValidator = (
  control: AbstractControl
): ValidationErrors | null => {
  return control.get('password')?.value ===
    control.get('passwordConfirm')?.value
    ? null
    : { mismatch: true };
};

export default passwordMatchValidator;
