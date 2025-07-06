import { AbstractControl, ValidatorFn } from '@angular/forms';

const DOT_NOTATION_REGEX = /^-?\d*\.?\d+$/;

const FLOAT_VALIDATION_ERROR = {
  floatNumberDotNotation: {
    text: 'i18n.validation.float',
  },
};

export const FloatNumberDotNotationValidator =
  (): ValidatorFn =>
  (
    control: AbstractControl
  ): {
    [key: string]: any;
  } | null => {
    if (!control.value) {
      return null;
    }
    const valid = DOT_NOTATION_REGEX.test(control.value);
    return valid ? null : FLOAT_VALIDATION_ERROR;
  };
