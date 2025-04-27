import { inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  dataAccess = inject(HomeDataAccessService);

  bites = this.dataAccess.bites;
}
