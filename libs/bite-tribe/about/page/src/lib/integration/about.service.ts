import { inject, Injectable } from '@angular/core';
import { AboutDataAccessService } from 'bite-tribe/about-data-access';

@Injectable({ providedIn: 'root' })
export class AboutService {
  dataAccess = inject(AboutDataAccessService);

  totalNumberBites = this.dataAccess.totalNumberBites;
  totalNumberUsers = this.dataAccess.totalNumberUsers;
}
