import { Meta, StoryObj } from '@storybook/angular';
import { DEFAULT_VIEWPORT } from 'storybook/viewport';

const meta: Meta<object> = {
  title: 'Tech/Graph',
  parameters: {
    options: { showPanel: false },
    viewport: {
      defaultViewport: DEFAULT_VIEWPORT,
    },
  },
} as Meta<object>;

export default meta;
type Story = StoryObj<object>;

export const DependencyGraph: Story = {
  render: (args) => ({
    props: args,
    template:
      '<iframe id="serviceFrameSend" src="assets/temp/nxgraph.html#/projects/all" width="100%" height="100%">',
  }),
};
DependencyGraph.args = {};
