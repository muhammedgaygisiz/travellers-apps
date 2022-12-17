import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { moduleMetadata } from '@storybook/angular';
import { action } from '@storybook/addon-actions';
import { ScenarioComponent } from '../scenario.component';
import { KosamlConceptualDesignBaseScenarioFeatureModule } from '../../../kosaml-conceptual-design-base-scenario-feature.module';

export default {
  title: 'Conceptual Desing/Base/Scenario',
  decorators: [
    moduleMetadata({
      imports: [
        BrowserAnimationsModule,
        KosamlConceptualDesignBaseScenarioFeatureModule,
      ],
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
