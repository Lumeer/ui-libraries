import {ChangeDetectionStrategy, Component, ContentChild, EventEmitter, Input, OnChanges, Output, SimpleChanges, TemplateRef} from '@angular/core';
import {LmrPivotConfig, LmrPivotTransform} from './util/lmr-pivot-config';
import {Attribute, AttributesResourceType, Collection, ConstraintData, DocumentModel, DocumentsAndLinksData, generateId, LanguageTag, Query} from '@lumeer/data-filters';
import {LmrPivotData} from './util/lmr-pivot-data';
import {LmrPivotTable, LmrPivotTableCell} from './util/lmr-pivot-table';
import {LmrSimplePivotConfig} from './util/lmr-simple-pivot-config';
import {LmrEmptyTablesTemplateDirective, LmrTableCellTemplateDirective} from './directives/lmr-templates.directive';

@Component({
    selector: 'lmr-simple-pivot-table',
    templateUrl: 'lmr-simple-pivot-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class LmrSimplePivotTableComponent implements OnChanges {

  @Input()
  public rows: Record<string, any>[];

  @Input()
  public attributes: Attribute[];

  @Input()
  public color: string;

  @Input()
  public config: LmrSimplePivotConfig;

  @Input()
  public transform: LmrPivotTransform;

  @Input()
  public locale: LanguageTag;

  @Input()
  public initiallyCollapsed: boolean;

  @Output()
  public cellClick = new EventEmitter<{cell: LmrPivotTableCell; tableIndex: number; rowIndex: number; columnIndex: number }>();

  @Output()
  public pivotDataChange = new EventEmitter<LmrPivotData>();

  @Output()
  public pivotTablesChange = new EventEmitter<LmrPivotTable[]>();

  @ContentChild(LmrEmptyTablesTemplateDirective, { read: TemplateRef }) emptyTablesTemplate: TemplateRef<any>;
  @ContentChild(LmrTableCellTemplateDirective, { read: TemplateRef }) tableCellTemplate: TemplateRef<any>;

  public readonly collectionId = generateId()
  public readonly query: Query = {stems: [{collectionId: this.collectionId}]};

  public collection: Collection = this.createCollection();
  public pivotConfig: LmrPivotConfig = this.createConfig();
  public data: DocumentsAndLinksData = this.createRows();
  public constraintData: ConstraintData;

  public ngOnChanges(changes: SimpleChanges) {
    if (changes['rows']) {
      this.data = this.createRows();
    }
    if (changes['attributes'] || changes['color']) {
      this.collection = this.createCollection();
    }
    if (changes['config']) {
      this.pivotConfig = this.createConfig();
    }
    this.constraintData = {
      locale: this.locale || LanguageTag.USA,
    }
  }

  private createCollection(): Collection {
    return {
      id: this.collectionId,
      attributes: (this.attributes || []),
      color: this.color,
    }
  }

  private createConfig(): LmrPivotConfig {
    return {
      stemsConfigs: [{
        stem: this.query.stems[0],
        rowAttributes: (this.config?.rowAttributes || []).map(attribute => ({...attribute, resourceId: this.collectionId, resourceIndex: 0, resourceType: AttributesResourceType.Collection})),
        columnAttributes: (this.config?.columnAttributes || []).map(attribute => ({...attribute, resourceId: this.collectionId, resourceIndex: 0, resourceType: AttributesResourceType.Collection})),
        valueAttributes: (this.config?.valueAttributes || []).map(attribute => ({...attribute, resourceId: this.collectionId, resourceIndex: 0, resourceType: AttributesResourceType.Collection}))
      }]
    }
  }

  private createRows(): DocumentsAndLinksData {
    const documents = (this.rows || []).map<DocumentModel>((row, index) => ({id: index.toString(), collectionId: this.collection.id, data: row}));
    return ({
      uniqueDocuments: documents,
      uniqueLinkInstances: [],
      dataByStems: [{
        stem: this.query.stems[0],
        linkInstances: [],
        documents
      }]
    })
  }

}
