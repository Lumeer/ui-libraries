import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {PivotTable, PivotTableCell} from '../util/pivot-table';
import {PivotTableConverter} from '../util/pivot-table-converter';
import {ConstraintData} from '@lumeer/data-filters';
import {PivotData} from '../util/pivot-data';

@Component({
  selector: 'pivot-tables',
  templateUrl: './pivot-tables.component.html',
  styleUrls: ['./pivot-tables.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PivotTablesComponent implements OnChanges {
  @Input()
  public pivotData: PivotData;

  @Input()
  public constraintData: ConstraintData;

  @Input()
  public dataLoaded: boolean;

  @Output()
  public cellClick = new EventEmitter<PivotTableCell>();

  private pivotTableConverter: PivotTableConverter;

  public pivotTables: PivotTable[];

  constructor() {
    const headerSummaryString = 'Summary of';
    const summaryString = 'Summary';
    this.pivotTableConverter = new PivotTableConverter(headerSummaryString, summaryString);
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes['pivotData']) {
      this.pivotTables = this.pivotTableConverter.transform(this.pivotData);
    }
  }

  public onCellClick(cell: PivotTableCell) {
    this.cellClick.next(cell);
  }
}
