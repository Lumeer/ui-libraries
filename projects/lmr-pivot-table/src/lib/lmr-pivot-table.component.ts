import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {PivotConfig} from './util/pivot-config';
import {Collection, ConstraintData, DataAggregationType, DocumentsAndLinksData, LinkType, Query} from '@lumeer/data-filters';
import {PivotDataConverter} from './util/pivot-data-converter';
import {PivotData} from './util/pivot-data';
import {asyncScheduler, BehaviorSubject, filter, map, Observable, throttleTime} from 'rxjs';
import {PivotTableCell} from './util/pivot-table';

interface Data {
  collections: Collection[];
  linkTypes: LinkType[];
  data: DocumentsAndLinksData;
  query: Query;
  constraintData: ConstraintData;
  config: PivotConfig;
}

@Component({
  selector: 'lmr-pivot-table',
  templateUrl: 'lmr-pivot-table.component.html',
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
  public pivotConfig: PivotConfig;

  @Input()
  public dataLoaded: boolean;

  @Output()
  public cellClick = new EventEmitter<PivotTableCell>();

  private readonly pivotTransformer: PivotDataConverter;
  private dataSubject = new BehaviorSubject<Data>(null);

  public pivotData$: Observable<PivotData>;

  constructor() {
    // TODO constructor properties
    this.pivotTransformer = new PivotDataConverter((c1, c2) => c1, type =>
      this.createValueAggregationTitle(type)
    );
  }

  private createValueAggregationTitle(aggregation: DataAggregationType): string {
    return aggregation.toString()
  }

  public ngOnInit() {
    const observable = this.dataSubject.pipe(filter(data => !!data));

    this.pivotData$ = observable.pipe(
      throttleTime(200, asyncScheduler, {trailing: true, leading: true}),
      map(data => this.handleData(data))
    );
  }

  private handleData(data: Data): PivotData {
    return this.pivotTransformer.transform(
      data.config,
      data.collections,
      data.linkTypes,
      data.data,
      data.query,
      data.constraintData
    );
  }

  public ngOnChanges(changes: SimpleChanges) {
    this.dataSubject.next({
      config: this.pivotConfig,
      collections: this.collections,
      linkTypes: this.linkTypes,
      data: this.data,
      query: this.query,
      constraintData: this.constraintData,
    });
  }

}
