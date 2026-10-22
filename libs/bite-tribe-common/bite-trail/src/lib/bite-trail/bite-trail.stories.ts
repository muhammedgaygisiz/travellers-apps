import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { BiteTrail } from 'model';
import { BiteTrailComponent } from './bite-trail';

addNecessaryIcons();

// Bundled demo images: visual references must not depend on live images.
const trail: BiteTrail = {
  id: 'trail1',
  ownerId: 'owner1',
  name: 'Bern in five peaches',
  biteIds: ['bite1', 'bite2', 'bite3'],
  imagePath: 'assets/demo/bite-demo.png',
  ownerImagePath: 'assets/demo/avatar-demo.png',
  ownerName: 'chiyoko',
  location: 'Bern',
  description: 'Five stone fruits worth the walk.',
  price: 0,
  currency: 'CHF',
};

/**
 * Holds the card in its pressed state, the way the bite-tribe press listener
 * leaves it while a finger is down. A story cannot hold a finger down, and the
 * listener only runs in the app, so this sets the class it would.
 */
@Directive({ selector: '[storyPressedCard]' })
class StoryPressedCardDirective implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    this.host.nativeElement
      .querySelector('ion-card')
      ?.classList.add('bt-pressed');
  }
}

export default {
  title: 'Components/BiteTrail Card',
  component: BiteTrailComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
    moduleMetadata({ imports: [StoryPressedCardDirective] }),
  ],
} as Meta<BiteTrailComponent>;

type Story = StoryObj<BiteTrailComponent>;

/**
 * The whole card opens the BiteTrail. The owner name opens the owner's
 * profile and View BiteTrail opens the trail, each pressing on its own
 * (issue #1765).
 */
export const Rest: Story = {
  args: { biteTrail: trail },
  render: (args) => ({
    props: { ...args },
    template: `
      <div class="ion-margin bt-press-feedback">
        <bite-trail [biteTrail]="biteTrail" />
      </div>
    `,
  }),
};

/** A finger down on the card: the whole card gives way. */
export const Pressed: Story = {
  args: { biteTrail: trail },
  render: (args) => ({
    props: { ...args },
    template: `
      <div class="ion-margin bt-press-feedback" storyPressedCard>
        <bite-trail [biteTrail]="biteTrail" />
      </div>
    `,
  }),
};
