import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { applicationConfig } from '@storybook/angular';
import { action } from 'storybook/actions';
import { ScenarioComponent } from '../scenario.component';

export default {
  title: 'Conceptual Design/Base/Scenario',
  component: ScenarioComponent,
  decorators: [
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
};

export const EmptyScenario = (): any => ({
  component: ScenarioComponent,
});

export const FilledScenario = (): any => ({
  component: ScenarioComponent,
  props: {
    model: {
      title: 'This is a title',
      description: 'This is a description',
    },
  },
});

export const ScenarioWithDeleteButton = (): any => ({
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
