import { from, lastValueFrom, toArray } from 'rxjs';
import { newCountryCode, newCountryCodes } from '../new-country-codes';

describe('newCountryCode', () => {
  it('answers the code an update adds', () => {
    expect(newCountryCode(['DE'], ['DE', 'JP'])).toBe('JP');
  });

  it('answers nothing when the previous codes were empty', () => {
    expect(newCountryCode([], ['DE'])).toBeUndefined();
    expect(newCountryCode(undefined, ['DE'])).toBeUndefined();
    expect(newCountryCode(null, ['DE'])).toBeUndefined();
  });

  it('answers once for an update that adds two codes', () => {
    expect(newCountryCode(['DE'], ['DE', 'JP', 'TH'])).toBe('JP');
  });

  it('answers nothing for an update that removes a code', () => {
    expect(newCountryCode(['DE', 'JP'], ['DE'])).toBeUndefined();
  });

  it('answers nothing when the codes are unchanged', () => {
    expect(newCountryCode(['DE', 'JP'], ['JP', 'DE'])).toBeUndefined();
  });

  it('reads the codes the way the profile flags do', () => {
    expect(newCountryCode([' de '], ['DE', 'de', ' ', 'jp'])).toBe('JP');
    expect(newCountryCode(['', ' '], ['DE'])).toBeUndefined();
  });
});

describe('newCountryCodes', () => {
  const emitted = (
    snapshots: { countryCodes?: string[] }[],
  ): Promise<string[]> =>
    lastValueFrom(from(snapshots).pipe(newCountryCodes(), toArray()));

  it('never celebrates the first snapshot, whatever it holds', async () => {
    await expect(emitted([{ countryCodes: ['DE', 'JP'] }])).resolves.toEqual(
      [],
    );
  });

  it('emits each country a later snapshot adds', async () => {
    await expect(
      emitted([
        { countryCodes: ['DE'] },
        { countryCodes: ['DE'] },
        { countryCodes: ['DE', 'JP'] },
        { countryCodes: ['DE', 'JP', 'TH', 'VN'] },
        { countryCodes: ['DE', 'JP'] },
      ]),
    ).resolves.toEqual(['JP', 'TH']);
  });

  it('lets the first Bite outrank the first country', async () => {
    await expect(
      emitted([{}, { countryCodes: ['DE'] }, { countryCodes: ['DE', 'JP'] }]),
    ).resolves.toEqual(['JP']);
  });
});
