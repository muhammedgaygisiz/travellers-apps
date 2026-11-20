import { inject, Injectable } from '@angular/core';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import type { BiteTrail, FolderPhotoVerdict } from 'model';
import { ToastService } from 'toast';
import { TranslocoService } from '@jsverse/transloco';
import { photoRefusalReasonKey } from 'bite-tribe-common/bite';

@Injectable({ providedIn: 'root' })
export class CreateBiteTrailService {
  private readonly dataAccess = inject(CreateBiteTrailDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly loadingController = inject(LoadingController);

  /** One save at a time: a second submit would create a second trail. */
  private saving = false;

  bites = this.dataAccess.bites;
  owner = this.dataAccess.owner;

  /** Read guarded: `value()` throws once the read has failed (#1232). */
  bitesValue = this.dataAccess.bitesValue;
  ownerValue = this.dataAccess.ownerValue;

  async submitBiteTrail(
    trailData: Omit<
      BiteTrail,
      | 'id'
      | 'createdAt'
      | 'createdAtTimestamp'
      | 'updatedAt'
      | 'updatedAtTimestamp'
    >,
  ): Promise<void> {
    if (this.saving) {
      return;
    }
    this.saving = true;

    // Modal, as on the admin app's new-restaurant page: the upload and the
    // image check can take a while (GitHub issue #2141).
    const loading = await this.loadingController.create({
      message: this.transloco.translate('bite-trail-saving'),
      backdropDismiss: false,
    });
    await loading.present();

    try {
      const photoVerdict = await this.dataAccess.createBiteTrail(trailData);
      await loading.dismiss();
      await this.reportCreated(!!trailData.image, photoVerdict);
      void this.navController.navigateBack([]);
    } catch {
      await loading.dismiss();
      await this.toast.present({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    } finally {
      this.saving = false;
    }
  }

  /**
   * Says the trail was created, and what became of its photo, which only the
   * image check publishes (GitHub issue #2141).
   */
  private reportCreated(
    hadPhoto: boolean,
    verdict: FolderPhotoVerdict | undefined,
  ): Promise<void> {
    if (verdict?.imageStatus === 'refused') {
      return this.toast.present({
        message: `${this.transloco.translate('bite-trail-created-photo-refused')} ${this.transloco.translate(photoRefusalReasonKey(verdict.imageRefusalCategory))}`,
        outcome: 'failure',
      });
    }

    return this.toast.present({
      messageKey:
        hadPhoto && !verdict
          ? 'bite-trail-created-photo-checking'
          : 'bite-trail-created',
      outcome: 'success',
    });
  }
}
