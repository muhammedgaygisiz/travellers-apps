import { Meta, StoryObj } from '@storybook/angular';
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
