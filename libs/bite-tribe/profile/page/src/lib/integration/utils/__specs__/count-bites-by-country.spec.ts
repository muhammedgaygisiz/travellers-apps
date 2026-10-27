import { countBitesByCountry } from '../count-bites-by-country';

/** GitHub issue #1787. */
describe('countBitesByCountry', () => {
  it('should count the Bites per country', () => {
    expect(
      countBitesByCountry([
        { countryCode: 'AT' },
        { countryCode: 'TH' },
        { countryCode: 'AT' },
      ]),
    ).toEqual({ AT: 2, TH: 1 });
  });

  it('should count codes the way the backend normalises them', () => {
    expect(
      countBitesByCountry([{ countryCode: ' at' }, { countryCode: 'AT ' }]),
    ).toEqual({ AT: 2 });
  });

  it('should leave out a Bite without a country', () => {
    expect(
      countBitesByCountry([
        { countryCode: undefined },
        { countryCode: '  ' },
        { countryCode: 'IT' },
      ]),
    ).toEqual({ IT: 1 });
  });
});
