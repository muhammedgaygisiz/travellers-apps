import { Injectable, signal } from '@angular/core';
import type { UploadParams } from 'model';

export interface BiteImageUploadProgress {
  progress: UploadParams;
  imagePath: string;
}

@Injectable({ providedIn: 'root' })
export class BiteImageUploadStateService {
  private readonly _uploadProgress = signal<
    Record<string, BiteImageUploadProgress>
  >({});

  readonly uploadProgress = this._uploadProgress.asReadonly();

  setProgress(biteId: string, progress: UploadParams, imagePath: string): void {
    this._uploadProgress.update((state) => ({
      ...state,
      [biteId]: { progress, imagePath },
    }));
  }

  clearProgress(biteId: string): void {
    this._uploadProgress.update(
      (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => key !== biteId),
        ) as Record<string, BiteImageUploadProgress>,
    );
  }
}
