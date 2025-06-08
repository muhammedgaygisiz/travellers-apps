import { Pipe, PipeTransform } from '@angular/core';

// utility function
const base64ToBlobUrl = (base64: string, mimeType = 'image/jpeg'): string => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = Array.from(byteCharacters).map((c) => c.charCodeAt(0));
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
};

@Pipe({
  name: 'toBlobUrl',
})
export class ToBlobUrlPipe implements PipeTransform {
  transform(base64Url: string | undefined): string | undefined {
    if (base64Url) {
      return base64ToBlobUrl(base64Url);
    }

    return base64Url;
  }
}
