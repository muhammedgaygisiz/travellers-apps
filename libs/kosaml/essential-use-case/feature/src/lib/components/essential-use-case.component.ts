import { Component, Input } from '@angular/core';

@Component({
  selector: 'kosaml-essential-use-case',
  templateUrl: './essential-use-case.component.html',
  styleUrls: ['./essential-use-case.component.scss'],
})
export class EssentialUseCaseComponent {
  @Input()
  dataSource: any;

  displayedColumns: string[] = ['usersPurpose', 'systemResponsibility'];
}
