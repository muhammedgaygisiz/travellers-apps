import { Component, OnInit, input } from '@angular/core';
import { ConceptualDesignUseCaseTypes } from './api/types';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'kosaml-cp-base-use-case',
  templateUrl: './cp-base-use-case.component.html',
  styleUrls: ['./cp-base-use-case.component.scss'],
  imports: [MatTableModule],
})
export class CpBaseUseCaseComponent implements OnInit {
  readonly type = input<ConceptualDesignUseCaseTypes>();

  readonly dataSource = input<any>();

  displayedColumns?: string[];

  ngOnInit() {
    this.displayedColumns = this.initializeDisplayedColumns(this.type());
  }

  private initializeDisplayedColumns(
    type: ConceptualDesignUseCaseTypes | undefined
  ) {
    if (type === ConceptualDesignUseCaseTypes.ESSENTIAL) {
      return ['usersPurpose', 'systemResponsibility'];
    }

    if (type === ConceptualDesignUseCaseTypes.CONCRETE) {
      return ['userAction', 'systemResponse'];
    }

    return [];
  }

  getColumnName(column: string) {
    if (column === 'usersPurpose') {
      return "User's purpose";
    }

    if (column === 'systemResponsibility') {
      return 'System responsibility';
    }

    if (column === 'userAction') {
      return 'User action';
    }

    if (column === 'systemResponse') {
      return 'System response';
    }

    return column;
  }
}
