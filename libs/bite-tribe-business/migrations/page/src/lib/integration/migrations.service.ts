import { inject, Injectable } from '@angular/core';
import { MigrationsDataAccessService } from 'bite-tribe-business/migrations-data-access';

@Injectable({ providedIn: 'root' })
export class MigrationsService {
  private readonly dataAccess = inject(MigrationsDataAccessService);

  bites = this.dataAccess.bites;
}
