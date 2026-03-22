import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeBusinessOrganisationDashboardDataAccess } from './organisation-dashboard-data-access';

describe('BiteTribeBusinessOrganisationDashboardDataAccess', () => {
  let component: BiteTribeBusinessOrganisationDashboardDataAccess;
  let fixture: ComponentFixture<BiteTribeBusinessOrganisationDashboardDataAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTribeBusinessOrganisationDashboardDataAccess],
    }).compileComponents();

    fixture = TestBed.createComponent(
      BiteTribeBusinessOrganisationDashboardDataAccess,
    );
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
