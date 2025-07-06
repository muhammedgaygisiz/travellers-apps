import { FormControl } from '@angular/forms';
import { FloatNumberDotNotationValidator } from '../float-number-dot-notation.validator';

describe('FloatNumberDotNotationValidator', () => {
  describe('given a validated control', () => {
    let control: FormControl;

    beforeEach(() => {
      control = new FormControl();
      control.addValidators(FloatNumberDotNotationValidator());
    });

    it('should validate commas as invalid', () => {
      control.setValue('9,123');
      expect(control.valid).toBe(false);
    });

    it('should validate text as invalid', () => {
      control.setValue('test');
      expect(control.valid).toBe(false);
    });

    it('should validate thousand-separators as invalid', () => {
      control.setValue("1'000");
      expect(control.valid).toBe(false);
    });

    it('should validate "no-rest" symbol as invalid', () => {
      control.setValue('50.-');
      expect(control.valid).toBe(false);
    });

    it('should validate dot-separated decimal string as valid', () => {
      control.setValue('9.5123');
      expect(control.valid).toBe(true);
    });

    it('should validate dot-separated decimal number as valid', () => {
      control.setValue(9.5123);
      expect(control.valid).toBe(true);
    });

    it('should validate negative decimal number as valid', () => {
      control.setValue(-9.5123);
      expect(control.valid).toBe(true);
    });

    it('should validate negative decimal string as valid', () => {
      control.setValue('-9.5123');
      expect(control.valid).toBe(true);
    });

    it('should validate empty input as valid', () => {
      control.setValue('');
      expect(control.valid).toBe(true);
    });

    it('should validate 0 as valid', () => {
      control.setValue(0);
      expect(control.valid).toBe(true);
    });

    it('should return validation error', () => {
      control.setValue('9,123');
      expect(control.errors).toEqual({
        floatNumberDotNotation: {
          text: 'i18n.validation.float',
        },
      });
    });
  });
});
