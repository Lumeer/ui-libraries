import {ChangeDetectionStrategy, Component, ContentChild, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef} from '@angular/core';
import {LmrPivotConfig, LmrPivotTransform} from './util/lmr-pivot-config';
import {Collection, ConstraintData, DocumentsAndLinksData, LinkType, Query} from '@lumeer/data-filters';
import {PivotDataConverter} from './util/pivot-data-converter';
import {LmrPivotData} from './util/lmr-pivot-data';
import {asyncScheduler, BehaviorSubject, filter, map, Observable, tap, throttleTime} from 'rxjs';
import {LmrPivotTable, LmrPivotTableCell} from './util/lmr-pivot-table';
import {PivotTableConverter} from './util/pivot-table-converter';
import {LmrEmptyTablesTemplateDirective, LmrTableCellTemplateDirective} from './directives/lmr-templates.directive';
import {collapseAllCells, isCellExpandable, LmrPivotTableState, toggleExpanded} from './util/lmr-pivot-state';
import {isPivotConfigChanged} from './util/pivot-util';

interface Data {
  collections: Collection[];
  linkTypes: LinkType[];
  data: DocumentsAndLinksData;
  query: Query;
  constraintData: ConstraintData;
  config: LmrPivotConfig;
  transform: LmrPivotTransform;
}

@Component({
  selector: 'lmr-pivot-table',
  templateUrl: 'lmr-pivot-table.component.html',
  styleUrls: ['./lmr-pivot-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmrPivotTableComponent implements OnInit, OnChanges {

  @Input()
  public collections: Collection[];

  @Input()
  public data: DocumentsAndLinksData;

  @Input()
  public linkTypes: LinkType[];

  @Input()
  public query: Query;

  @Input()
  public constraintData: ConstraintData;

  @Input()
  public config: LmrPivotConfig;

  @Input()
  public transform: LmrPivotTransform;

  @Input()
  public emptyTablesTemplateInput: TemplateRef<any>;

  @Input()
  public tableCellTemplateInput: TemplateRef<any>;

  @Input()
  public initiallyCollapsed: boolean;

  @Output()
  public cellClick = new EventEmitter<{cell: LmrPivotTableCell; tableIndex: number; rowIndex: number; columnIndex: number }>();

  @Output()
  public pivotDataChange = new EventEmitter<LmrPivotData>();

  @Output()
  public pivotTablesChange = new EventEmitter<LmrPivotTable[]>();

  @ContentChild(LmrEmptyTablesTemplateDirective, {read: TemplateRef}) emptyTablesTemplate: TemplateRef<any>;
  @ContentChild(LmrTableCellTemplateDirective, {read: TemplateRef}) tableCellTemplate: TemplateRef<any>;

  private readonly pivotTransformer = new PivotDataConverter();
  private readonly pivotTableConverter: PivotTableConverter = new PivotTableConverter();
  public readonly stickyColumnWidth = 150;
  public readonly stickyColumnHeight = 150;

  private dataSubject$ = new BehaviorSubject<Data>(null);
  private currentTables: LmrPivotTable[];

  public pivotData$: Observable<LmrPivotData>;
  public pivotTables$: Observable<LmrPivotTable[]>;
  public pivotStates$ = new BehaviorSubject<LmrPivotTableState[]>([]);

  public ngOnInit() {
    const observable = this.dataSubject$.pipe(filter(data => !!data));

    this.pivotData$ = observable.pipe(
      throttleTime(200, asyncScheduler, {trailing: true, leading: true}),
      map(data => this.handleData(data)),
      tap(data => this.onPivotDataChange(data)),
    );

    this.pivotTables$ = this.pivotData$.pipe(
      map(data => this.pivotTableConverter.createTables(data, this.transform)),
      tap(tables => this.onPivotTablesChange(tables))
    );
  }

  private onPivotDataChange(data: LmrPivotData) {
    this.pivotDataChange.emit(data);
  }

  private onPivotTablesChange(tables: LmrPivotTable[]) {
    if (this.initiallyCollapsed && tablesAreVeryDifferent(this.currentTables, tables)) {
      this.pivotStates$.next(tables.map(table => collapseAllCells(table)));
    }

    this.currentTables = tables;
    this.pivotTablesChange.emit(tables);
  }

  private handleData(data: Data): LmrPivotData {
    return this.pivotTransformer.createData(
      data.config,
      data.transform,
      data.collections,
      data.linkTypes,
      data.data,
      data.query,
      data.constraintData
    );
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (shouldResetState(changes)) {
      this.resetState();
    }
    this.dataSubject$.next({
      config: this.config,
      transform: this.transform,
      collections: this.collections,
      linkTypes: this.linkTypes,
      data: this.data,
      query: this.query,
      constraintData: this.constraintData,
    });
  }

  private resetState() {
    // this.pivotStates$.next([]);
  }

  public onCellClick(cell: LmrPivotTableCell, row: LmrPivotTableCell[], tableIndex: number, rowIndex: number, columnIndex: number) {
    if (isCellExpandable(cell)) {
      const oldState = this.pivotStates$.value[tableIndex]
      const newState = toggleExpanded(cell, columnIndex, oldState)
      this.setState(tableIndex, newState)
    } else if (cell?.isHeader || cell?.isValue) {
      const headerCell = cell.isHeader ? cell : row.find(c => c.isHeader)
      this.cellClick.emit({cell, tableIndex, rowIndex: headerCell?.originalRowIndex || rowIndex, columnIndex})
    }
  }

  private setState(index: number, state: LmrPivotTableState) {
    const statesCopy = [...(this.pivotStates$.value || [])];
    statesCopy.splice(index, 1, state)
    this.pivotStates$.next(statesCopy)
  }
}

function shouldResetState(changes: SimpleChanges): boolean {
  if (changes['config']) {
    const previousValue = changes['config'].previousValue as LmrPivotConfig
    const currentValue = changes['config'].currentValue as LmrPivotConfig
    return isPivotConfigChanged(previousValue, currentValue)
  }
  return false;
}

function tablesAreVeryDifferent(t1: LmrPivotTable[], t2: LmrPivotTable[]): boolean {
  if ((t1 || []).length !== (t2 || []).length) {
    return true
  }
  // row numbers are different
  return (t1 || []).some((t, index) => t.cells?.length !== t2[index].cells?.length);
}
