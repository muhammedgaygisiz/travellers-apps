import { summaryLineName } from '../visit-summary';
import type { OrderLineOptionSnapshot } from '../table-order';

/** The dish name the visit summary mail prints (GitHub issue #2254). */
describe('summaryLineName', () => {
  const option = (choiceName: string): OrderLineOptionSnapshot => ({
    groupId: 'heat',
    groupName: 'Zubereitungsart',
    choiceId: choiceName,
    choiceName,
  });

  it('prints a plain dish by its name', () => {
    expect(summaryLineName({ name: 'Edamame' })).toBe('Edamame');
  });

  it('adds the variant', () => {
    expect(summaryLineName({ name: 'Ente Spezial', variantName: 'groß' })).toBe(
      'Ente Spezial - groß',
    );
  });

  it('adds the chosen options after the variant', () => {
    expect(
      summaryLineName({
        name: 'Ente Spezial',
        variantName: 'groß',
        options: [option('scharf')],
      }),
    ).toBe('Ente Spezial - groß, scharf');
  });

  it('prints options on a dish without variants', () => {
    expect(
      summaryLineName({
        name: 'Chop-Suey-Spezial',
        options: [option('nicht scharf')],
      }),
    ).toBe('Chop-Suey-Spezial - nicht scharf');
  });
});
