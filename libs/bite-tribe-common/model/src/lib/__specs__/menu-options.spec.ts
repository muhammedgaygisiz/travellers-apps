import { missingRequiredOptions } from '../menu';
import type { MenuItem, MenuOptionGroup } from '../menu';
import { createOrderLineSnapshot, orderLineChoiceNames } from '../order-line';

const HEAT: MenuOptionGroup = {
  id: 'heat',
  name: 'Zubereitungsart',
  required: true,
  choices: [
    { id: 'mild', name: 'nicht scharf' },
    { id: 'hot', name: 'scharf' },
  ],
};

const SAUCE: MenuOptionGroup = {
  id: 'sauce',
  name: 'Sauce',
  required: false,
  choices: [
    { id: 'side', name: 'on the side' },
    { id: 'over', name: 'over it' },
  ],
};

const ENTE: MenuItem = {
  id: 'ente',
  name: 'Ente Spezial',
  description: '',
  price: 0,
  variants: [{ id: 'gross', name: 'groß', description: '', price: 15.4 }],
  optionGroups: [HEAT, SAUCE],
};

/** Options: choices on a dish that don't change its price (#2254). */
describe('menu options', () => {
  describe('missingRequiredOptions', () => {
    it('names the required groups nothing was chosen in', () => {
      expect(missingRequiredOptions(ENTE, [])).toEqual([HEAT]);
      expect(missingRequiredOptions(ENTE, ['sauce'])).toEqual([HEAT]);
    });

    it('is empty once every required group is answered', () => {
      expect(missingRequiredOptions(ENTE, ['heat'])).toEqual([]);
    });

    it('is empty for a dish without options, or no dish', () => {
      expect(missingRequiredOptions({}, [])).toEqual([]);
      expect(missingRequiredOptions(undefined, [])).toEqual([]);
    });
  });

  describe('createOrderLineSnapshot', () => {
    it('copies each chosen option by id and name, at no price', () => {
      const line = createOrderLineSnapshot({
        item: ENTE,
        variant: ENTE.variants?.[0],
        quantity: 1,
        currency: 'EUR',
        options: [{ group: HEAT, choice: HEAT.choices[1] }],
      });

      expect(line.options).toEqual([
        {
          groupId: 'heat',
          groupName: 'Zubereitungsart',
          choiceId: 'hot',
          choiceName: 'scharf',
        },
      ]);
      expect(line.price).toBe(15.4);
    });

    it('writes no options field when none were chosen', () => {
      const line = createOrderLineSnapshot({
        item: ENTE,
        quantity: 1,
        currency: 'EUR',
        options: [],
      });

      expect('options' in line).toBe(false);
    });
  });

  describe('orderLineChoiceNames', () => {
    it('lists the variant, then each chosen option', () => {
      expect(
        orderLineChoiceNames({
          variantName: 'groß',
          options: [
            {
              groupId: 'heat',
              groupName: 'Zubereitungsart',
              choiceId: 'hot',
              choiceName: 'scharf',
            },
          ],
        }),
      ).toEqual(['groß', 'scharf']);
    });

    it('is empty for a plain dish', () => {
      expect(orderLineChoiceNames({})).toEqual([]);
    });
  });
});
