import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonChip } from '@ionic/angular/standalone';

@Component({
  selector: 'tags',
  imports: [IonChip],
  template: `
    @for (tag of tags(); track tag) {
    <ion-chip>{{ tag }}</ion-chip>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagsComponent {
  tags = input<string[] | undefined>([]);
}
