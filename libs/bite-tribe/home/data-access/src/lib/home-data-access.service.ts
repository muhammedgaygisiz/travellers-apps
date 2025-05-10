import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite } from 'model';
import { Platform } from '@ionic/angular';
import { getCurrentPosition } from 'geolocation';
import { from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HomeDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly platform = inject(Platform);

  bites = toSignal(this.storeService.bites$, { initialValue: [] as Bite[] });
  userId = toSignal(this.storeService.userId, { initialValue: '' });

  logout() {
    this.storeService.logout();
  }

  submitLikeClick(likeType: { likeType: string; biteId: string }) {
    const bites = this.bites();
    const userId = this.userId();

    const bite = bites?.find((bite) => bite.id === likeType.biteId);
    const likeFromUser = bite?.likes?.find(
      (like) => like.userId === userId && like.likeType === likeType.likeType
    );

    if (likeFromUser) {
      this.storeService.removeLike(likeType);
      return;
    }

    this.storeService.submitLikeClick(likeType);
  }

  currentPosition() {
    return toSignal(from(getCurrentPosition(this.platform)), {
      initialValue: null,
    });
  }
}
