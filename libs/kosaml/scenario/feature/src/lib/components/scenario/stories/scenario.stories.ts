import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { moduleMetadata } from '@storybook/angular';
import { SharedModule } from 'src/app/shared/shared.module';
import { ScenarioComponent } from '../..';
import { action } from '@storybook/addon-actions';

export default {
  title: 'Scenario',
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, SharedModule],
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
