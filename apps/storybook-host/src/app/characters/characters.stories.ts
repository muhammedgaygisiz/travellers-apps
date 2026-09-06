import { Meta, StoryObj } from '@storybook/angular';
import { DEFAULT_VIEWPORT } from 'storybook/viewport';

/**
 * The BiteTribe character set.
 *
 * Every character is the same bitten cookie wearing a different piece of
 * cultural headwear, and the shipped logo is one of them - a feathered
 * headdress - rather than a separate mark the others were derived from. That is
 * why it stands in the line-up instead of above it.
 *
 * Rendering them together is also the only place the palette drift is visible:
 * the logo carries the earlier `#55422A` outline over a `#F0B967` cookie, the
 * seven new characters a darker `#402810` over a more saturated `#F8B850`.
 *
 * The SVGs are served from `ssot/assets/characters` through a `staticDirs`
 * entry in `.storybook/main.ts`, and the logo from the app assets it already
 * ships in. See [[Implementation - Brand Characters]] for where the set lives
 * and how it was produced.
 */
interface Character {
  readonly name: string;
  readonly note: string;
  readonly file: string;
}

/**
 * The names are the design export's, which mixes a historical term with
 * national ones. Settling a product vocabulary is a brand decision that issue
 * \#1482 deliberately left out of scope, so the showcase reports what the files
 * are called instead of inventing a second set of names.
 */
const CHARACTERS: readonly Character[] = [
  {
    name: 'BiteTribe',
    note: 'the shipped logo',
    file: 'assets/icons/logo.svg',
  },
  { name: 'Viking', note: '01', file: 'assets/characters/01-viking.svg' },
  { name: 'Arab', note: '02', file: 'assets/characters/02-arab.svg' },
  { name: 'Ethiopian', note: '03', file: 'assets/characters/03-ethiopian.svg' },
  { name: 'Turk', note: '04', file: 'assets/characters/04-turk.svg' },
  { name: 'Chinese', note: '05', file: 'assets/characters/05-chinese.svg' },
  { name: 'Japanese', note: '06', file: 'assets/characters/06-japanese.svg' },
  { name: 'Swiss', note: '07', file: 'assets/characters/07-swiss.svg' },
];

/**
 * Scoped under `.tribe` so the block does not leak into the stories that render
 * after it — a story template's `<style>` is inserted into the shared document,
 * not into a component's scoped sheet.
 */
const STYLES = `
  <style>
    .tribe {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 24px;
      padding: 24px;
      font-family: system-ui, sans-serif;
    }
    .tribe figure {
      margin: 0;
      text-align: center;
    }
    .tribe img {
      width: 100%;
      height: 160px;
      object-fit: contain;
    }
    .tribe figcaption {
      margin-top: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #422911;
    }
    .tribe small {
      display: block;
      font-weight: 400;
      color: #8a7a68;
    }
  </style>`;

const tile = ({ name, note, file }: Character): string => `
  <figure>
    <img src="${file}" alt="${name}" />
    <figcaption>${name}<small>${note}</small></figcaption>
  </figure>`;

const meta: Meta<object> = {
  title: 'Brand/Characters',
  parameters: {
    options: { showPanel: false },
    viewport: {
      defaultViewport: DEFAULT_VIEWPORT,
    },
  },
} as Meta<object>;

export default meta;
type Story = StoryObj<object>;

export const Tribe: Story = {
  render: (args) => ({
    props: args,
    template: `${STYLES}<div class="tribe">${CHARACTERS.map(tile).join('')}</div>`,
  }),
};
Tribe.args = {};
