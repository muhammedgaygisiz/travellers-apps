import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { moduleMetadata } from '@storybook/angular';
import { action } from '@storybook/addon-actions';
import { ScenarioComponent } from '../scenario.component';

export default {
  title: 'Conceptual Design/Base/Scenario',
  component: ScenarioComponent,
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule],
    }),
  ],
};

export const emptyScenario = () => ({
  component: ScenarioComponent,
});

export const filledScenario = () => ({
  component: ScenarioComponent,
  props: {
    model: {
      title: 'This is a title',
      description: 'This is a description',
    },
  },
});

export const scenarioWithDeleteButton = () => ({
  component: ScenarioComponent,
  props: {
    model: {
      title: 'This is a title',
      description: 'This is a description',
    },
    showDeleteButton: true,
    deleteScenario: action('Delete clicked'),
  },
});
