import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageComponent } from 'common/ui/page';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'organisation-dashboard',
  templateUrl: 'organisation-dashboard.html',
  imports: [PageComponent],
  styleUrl: 'organisation-dashboard.scss',
})
export class OrganisationDashboard {}
