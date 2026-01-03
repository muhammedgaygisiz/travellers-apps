import { beforeEach, describe, expect, it } from 'vitest';
import { FormControl } from '@angular/forms';
import { FloatNumberDotNotationValidator } from '../float-number-dot-notation.validator';

describe('FloatNumberDotNotationValidator', () => {
  let control: FormControl;

  beforeEach(() => {
    control = new FormControl();
    control.addValidators(FloatNumberDotNotationValidator());
  });

  it('should validate comma as valid', () => {
    control.setValue('9,123');
    expect(control.valid).toBe(true);
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

  it('should validate negative decimal number as invalid', () => {
    control.setValue(-9.5123);
    expect(control.valid).toBe(false);
  });

  it('should validate negative decimal string as invalid', () => {
    control.setValue('-9.5123');
    expect(control.valid).toBe(false);
  });

  it('should validate empty input as invalid', () => {
    control.setValue('');
    expect(control.valid).toBe(false);
  });

  it('should validate 0 as valid', () => {
    control.setValue(0);
    expect(control.valid).toBe(true);
  });

  it('should return validation no validation errors', () => {
    control.setValue('9,123');
    expect(control.errors).toEqual(null);
  });

  it('should validate dot as valid', () => {
    control.setValue('9.123');
    expect(control.valid).toBe(true);
  });

  it('should validate comma-separated decimal string as valid', () => {
    control.setValue('9,5123');
    expect(control.valid).toBe(true);
  });

  it('should validate comma-separated decimal number as valid', () => {
    control.setValue(9.5123);
    expect(control.valid).toBe(true);
  });

  it('should validate comma-separated negative decimal string as invalid', () => {
    control.setValue('-9,5123');
    expect(control.valid).toBe(false);
  });

  it('should validate 0 as valid', () => {
    control.setValue(0);
    expect(control.valid).toBe(true);
  });

  it('should return validation error for negative string', () => {
    control.setValue('-100');
    control.updateValueAndValidity();
    expect(control.errors).toEqual({
      floatNumberDotNotation: { text: 'i18n.validation.float' },
    });
  });
});
