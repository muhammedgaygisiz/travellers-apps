import { ValidatorFn, Validators } from '@angular/forms';
import { digit, lowerCase, minLength, upperCase } from 'utils';

const getPasswordValidators = (): ValidatorFn[] => [
  Validators.required,
  Validators.pattern(lowerCase),
  Validators.pattern(upperCase),
  Validators.pattern(digit),
  Validators.minLength(minLength),
];

export default getPasswordValidators;
