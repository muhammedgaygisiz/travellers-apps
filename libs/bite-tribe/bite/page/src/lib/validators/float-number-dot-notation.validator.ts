import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const DOT_NOTATION_REGEX = /^-?\d*\.?\d+$/;
const COMMA_NOTATION_REGEX = /^-?\d*,?\d+$/;

const FLOAT_VALIDATION_ERROR = {
  floatNumberDotNotation: {
    text: 'i18n.validation.float',
  },
};

export const FloatNumberDotNotationValidator =
  (): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const ctrlValue = control.value;
    if (!ctrlValue && ctrlValue !== 0) {
      return FLOAT_VALIDATION_ERROR;
    }

    const isNegativeNumber = typeof ctrlValue === 'number' && ctrlValue < 0;
    if (isNegativeNumber) {
      return FLOAT_VALIDATION_ERROR;
    }

    const isNegativeString =
      typeof ctrlValue === 'string' && Number(ctrlValue) < 0;
    if (isNegativeString) {
      return FLOAT_VALIDATION_ERROR;
    }

    if (typeof ctrlValue === 'string') {
      const isNegativeStr = ctrlValue.startsWith('-');
      if (isNegativeStr) {
        return FLOAT_VALIDATION_ERROR;
      }
    }

    if (typeof ctrlValue === 'string' && ctrlValue.includes(',')) {
      const valid = COMMA_NOTATION_REGEX.test(ctrlValue);
      return valid ? null : FLOAT_VALIDATION_ERROR;
    }

    if (typeof ctrlValue === 'number') {
      const isNegative = ctrlValue < 0;
      return isNegative ? FLOAT_VALIDATION_ERROR : null;
    }

    const valid = DOT_NOTATION_REGEX.test(ctrlValue);
    return valid ? null : FLOAT_VALIDATION_ERROR;
  };
