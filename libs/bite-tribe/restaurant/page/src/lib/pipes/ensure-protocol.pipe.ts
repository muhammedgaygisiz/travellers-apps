import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ensureProtocol',
})
export class EnsureProtocolPipe implements PipeTransform {
  transform(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }

    return url;
  }
}
