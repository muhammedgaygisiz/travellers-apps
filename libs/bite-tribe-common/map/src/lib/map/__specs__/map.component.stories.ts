import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { MapComponent } from '../map.component';
import { MarkerColor } from '../model/marker-color.enum';

export default {
  title: 'Components/Map',
  component: MapComponent,
  parameters: {
    /**
     * Excluded from the visual-regression run. Leaflet's cluster markers do not
     * paint at all in Loki's docker Chrome - the committed `Pages/Bitemap`
     * references show the same empty map - so a baseline here would lock in a
     * blank grey rectangle instead of the markers these stories exist to show.
     */
    loki: { skip: true },
  },
} as Meta<MapComponent>;

type Story = StoryObj<MapComponent>;

/**
 * The position candidates of a Bite, a few metres apart, each in the colour of
 * the source it stands for. This is the spread the create form compares in its
 * position source modal.
 */
const candidates = [
  { id: 'photo', latitude: 46.94245, longitude: 7.45715 },
  { id: 'restaurant', latitude: 46.9428, longitude: 7.45775 },
  { id: 'google', latitude: 46.9421, longitude: 7.4578 },
];

const candidateColors: Record<string, MarkerColor> = {
  photo: MarkerColor.RED,
  restaurant: MarkerColor.GREEN,
  google: MarkerColor.ORANGE,
};

export const Candidates: Story = {
  args: {
    geopoints: candidates,
    markerColors: candidateColors,
    clusterMarkers: false,
    readonly: true,
    enableZoom: false,
  },
};

/**
 * With a candidate selected, the map centres on it and renders its marker at
 * the larger size. Colour still names the source, so size alone marks the
 * selection - which is what keeps candidates readable when they sit metres
 * apart. See GitHub issue #1306.
 */
export const FocusedCandidate: Story = {
  args: {
    ...Candidates.args,
    focusedGeopointId: 'restaurant',
  },
};

/**
 * Wraps a map in the `dark` class the app puts on the document, so one story
 * renders dark without switching the whole page (see Implementation -
 * Storybook, "A Dark Story Cannot Switch The Document").
 */
const inDarkMode = componentWrapperDecorator(
  (story) =>
    `<div class="dark" style="background: #1a1c22; padding: 8px">${story}</div>`,
);

/**
 * A street in Bern with restaurants, cafes and bars, close enough for the
 * OpenStreetMap tiles to draw their icons and names.
 */
const restaurantStreet = [
  { id: 'kramgasse', latitude: 46.94808, longitude: 7.45116 },
];

/** The light map at street level, to compare with {@link DarkRestaurantStreet}. */
export const RestaurantStreet: Story = {
  args: {
    geopoints: restaurantStreet,
    readonly: true,
  },
};

/**
 * The same street in dark mode: the same tiles, recoloured, so every
 * restaurant, cafe and bar icon stays on the map. The marker keeps its red.
 * See GitHub issue #2022.
 */
export const DarkRestaurantStreet: Story = {
  args: RestaurantStreet.args,
  decorators: [inDarkMode],
};

/** The source candidates in dark mode, each marker in its own colour. */
export const DarkCandidates: Story = {
  args: Candidates.args,
  decorators: [inDarkMode],
};
