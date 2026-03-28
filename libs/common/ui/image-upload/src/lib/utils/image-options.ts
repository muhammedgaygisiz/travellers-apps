import { CameraResultType, CameraSource } from '@capacitor/camera';

export const photoOptions = {
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Base64,
  source: CameraSource.Prompt,
};

export const cameraOnlyOptions = {
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Base64,
  source: CameraSource.Camera,
};
