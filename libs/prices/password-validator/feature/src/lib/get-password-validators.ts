import { Validators } from '@angular/forms';
import {
  digit,
  lowerCase,
  minLength,
  upperCase,
} from '@travellers-apps/utils-common';

const getPasswordValidators = () =>
  Validators.compose([
    Validators.required,
    Validators.pattern(lowerCase),
    Validators.pattern(upperCase),
    Validators.pattern(digit),
    Validators.minLength(minLength),
  ]);

export default getPasswordValidators;
