import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonSkeletonText } from '@ionic/angular/standalone';
import { BiteSkeletonListComponent } from 'bite-tribe-common/bite';

@Component({
  selector: 'profile-skeleton',
  templateUrl: 'profile-skeleton.html',
  styleUrl: 'profile-skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonSkeletonText, BiteSkeletonListComponent],
})
export class ProfileSkeleton {}
