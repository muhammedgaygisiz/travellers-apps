import { CpBaseUseCaseComponent } from '../cp-base-use-case.component';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { KosamlConceptualDesignBaseUseCaseFeatureModule } from '../../../kosaml-conceptual-design-base-use-case-feature.module';
import { ConceptualDesignUseCaseTypes } from '../api/types';

export default {
  title: 'Conceptual Design/Base/Use Case',
  component: CpBaseUseCaseComponent,
  decorators: [
    moduleMetadata({
      imports: [KosamlConceptualDesignBaseUseCaseFeatureModule],
    }),
  ],
} as Meta<CpBaseUseCaseComponent>;

const Template: Story<CpBaseUseCaseComponent> = (
  args: CpBaseUseCaseComponent
) => ({
  props: args,
});

export const EssentialUseCase = Template.bind({});
EssentialUseCase.args = {
  type: ConceptualDesignUseCaseTypes.ESSENTIAL,
  dataSource: [
    {
      usersPurpose: 'Enter search parameters',
      systemResponsibility: 'Show results',
    },
    {
      usersPurpose: 'Select a resource',
      systemResponsibility:
        'Show the contact details of the owner of the selected resource',
    },
    {
      usersPurpose: 'Send an e-mail',
      systemResponsibility: 'Confirm the send',
    },
  ],
};

export const ConcreteUseCase = Template.bind({});
ConcreteUseCase.args = {
  type: ConceptualDesignUseCaseTypes.CONCRETE,
  dataSource: [
    {
      userAction: `The academic enters one or more of the search parameters
          for the CD-ROM: title, year and platform`,
      systemResponse: 'The system displays the search results',
    },
    {
      userAction: 'The academic selects a search result',
      systemResponse: `The system displays the full details of the CD-ROM
          and the contact details for its owner who is a research student`,
    },
    {
      userAction: 'The academic choses the e-mail address',
      systemResponse: `The system displays a message area`,
    },
    {
      userAction: 'The academic writes and sends the e-mail request',
      systemResponse: `The system confirms the sending of the request`,
    },
  ],
};
