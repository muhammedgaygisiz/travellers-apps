import { IsCheckedPipe } from '../is-checked.pipe';

describe('IsCheckedPipe', () => {
  const pipe = new IsCheckedPipe();

  it('should return true if value is in selection', () => {
    const value = 'test';
    const selection = ['test', 'example'];
    expect(pipe.transform(value, selection)).toBe(true);
  });

  it('should return false if value is not in selection', () => {
    const value = 'test';
    const selection = ['example'];
    expect(pipe.transform(value, selection)).toBe(false);
  });

  it('should return false for empty selection', () => {
    const value = 'test';
    const selection: string[] = [];
    expect(pipe.transform(value, selection)).toBe(false);
  });

  it('should handle empty value', () => {
    const value = '';
    const selection = ['test'];
    expect(pipe.transform(value, selection)).toBe(false);
  });
});
