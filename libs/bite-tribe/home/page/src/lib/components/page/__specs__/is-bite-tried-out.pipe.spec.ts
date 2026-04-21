import { IsBiteTriedOutPipe } from '../is-bite-tried-out.pipe';

describe('IsBiteTriedOutPipe', () => {
  const pipe = new IsBiteTriedOutPipe();

  it('should return true when bite id exists in triedOutBiteIds', () => {
    expect(pipe.transform('bite-1', ['bite-1', 'bite-2'])).toBe(true);
  });

  it('should return false when bite id does not exist in triedOutBiteIds', () => {
    expect(pipe.transform('bite-3', ['bite-1', 'bite-2'])).toBe(false);
  });

  it('should return false when triedOutBiteIds is empty', () => {
    expect(pipe.transform('bite-1', [])).toBe(false);
  });
});
