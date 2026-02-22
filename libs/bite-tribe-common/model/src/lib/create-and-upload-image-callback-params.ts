import { UploadFileCallbackEvent } from '@capacitor-firebase/storage';

export interface UploadParams {
  evt: UploadFileCallbackEvent | null;
  err: any;
  offlineImagePath: string;
}

export interface CreateAndUploadImageCallbackParams {
  uploadParams?: UploadParams;
  createdDocId?: string;
  imagePath: string;
}
