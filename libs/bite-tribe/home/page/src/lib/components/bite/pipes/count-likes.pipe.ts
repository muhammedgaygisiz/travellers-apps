import { Pipe, PipeTransform } from '@angular/core';
import { Bite } from 'model';

@Pipe({
  name: 'countLikes',
})
export class CountLikesPipe implements PipeTransform {
  transform(bite: Bite): number {
    const thumbup = bite?.thumbup || 0;
    const drooling = bite?.drooling || 0;
    const mindblown = bite?.mindblown || 0;

    return thumbup + drooling + mindblown;
  }
}
