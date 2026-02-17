import { Pipe, PipeTransform } from '@angular/core';
import { Bite, UploadParams } from 'model';
import { Filesystem } from '@capacitor/filesystem';

@Pipe({ name: 'getImage' })
export class GetImagePipe implements PipeTransform {
  async transform(
    bite: Bite | undefined,
    uploadState: { progress: UploadParams } | undefined | null,
  ): Promise<string> {
    const imagePath = bite?.imagePath || bite?.image;

    if (imagePath?.length && imagePath.length > 0) {
      return Promise.resolve(imagePath);
    }

    const offlineImagePath = uploadState?.progress?.offlineImagePath;

    if (offlineImagePath) {
      const readFileResult = await Filesystem.readFile({
        path: offlineImagePath,
      });
      return Promise.resolve(`data:image/jpeg;base64,${readFileResult.data}`);
    }

    return Promise.resolve(''); //TODO: return local image
  }
}
