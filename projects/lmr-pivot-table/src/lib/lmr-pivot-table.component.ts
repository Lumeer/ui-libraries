import {ChangeDetectionStrategy, Component, ContentChild, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef} from '@angular/core';
import {LmrPivotConfig, LmrPivotTransform} from './util/lmr-pivot-config';
import {Collection, ConstraintData, DocumentsAndLinksData, LinkType, Query} from '@lumeer/data-filters';
import {PivotDataConverter} from './util/pivot-data-converter';
import {LmrPivotData} from './util/lmr-pivot-data';
import {asyncScheduler, BehaviorSubject, filter, map, Observable, tap, throttleTime} from 'rxjs';
import {LmrPivotTable, LmrPivotTableCell} from './util/lmr-pivot-table';
import {PivotTableConverter} from './util/pivot-table-converter';
import {LmrEmptyTablesTemplateDirective, LmrTableCellTemplateDirective} from './directives/lmr-templates.directive';

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

  @Output()
  public cellClick = new EventEmitter<LmrPivotTableCell>();

  @Output()
  public pivotDataChange = new EventEmitter<LmrPivotData>();

  @Output()
  public pivotTablesChange = new EventEmitter<LmrPivotTable[]>();

  @ContentChild(LmrEmptyTablesTemplateDirective, { read: TemplateRef }) emptyTablesTemplate: TemplateRef<any>;
  @ContentChild(LmrTableCellTemplateDirective, { read: TemplateRef }) tableCellTemplate: TemplateRef<any>;

  private readonly pivotTransformer = new PivotDataConverter();
  private readonly pivotTableConverter: PivotTableConverter = new PivotTableConverter();

  private dataSubject = new BehaviorSubject<Data>(null);

  public pivotData$: Observable<LmrPivotData>;
  public pivotTables$: Observable<LmrPivotTable[]>;

  public ngOnInit() {
    const observable = this.dataSubject.pipe(filter(data => !!data));

    this.pivotData$ = observable.pipe(
      throttleTime(200, asyncScheduler, {trailing: true, leading: true}),
      map(data => this.handleData(data)),
      tap(data => this.pivotDataChange.emit(data)),
    );

    this.pivotTables$ = this.pivotData$.pipe(
      map(data => this.pivotTableConverter.createTables(data, this.transform)),
      tap(tables => this.pivotTablesChange.emit(tables))
    );
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
    this.dataSubject.next({
      config: this.config,
      transform: this.transform,
      collections: this.collections,
      linkTypes: this.linkTypes,
      data: this.data,
      query: this.query,
      constraintData: this.constraintData,
    });
  }

}
