import { UploadFileCallbackEvent } from '@capacitor-firebase/storage';

export interface UploadParams {
  evt: UploadFileCallbackEvent | null;
  err: any;
  offlineImagePath: string;
}

export interface CreateAndUploadBiteCallbackParams {
  uploadParams?: UploadParams;
  createdBiteId?: string;
  imagePath: string;
}
