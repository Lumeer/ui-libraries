import {Constraint, DataAggregationType, QueryAttribute, QueryStem} from '@lumeer/data-filters';

export interface LmrPivotConfig {
  version?: LmrPivotConfigVersion;
  stemsConfigs: LmrPivotStemConfig[];
  mergeTables?: boolean;
}

export interface LmrPivotTransform {
  checkValidConstraintOverride?: (c1: Constraint, c2: Constraint) => Constraint;
  translateAggregation?: (type: DataAggregationType) => string;
}

export interface LmrPivotStrings {
  summaryString: string;
  headerSummaryString: string;
}

export interface LmrPivotStemConfig {
  stem?: QueryStem;
  rowAttributes: LmrPivotRowAttribute[];
  columnAttributes: LmrPivotColumnAttribute[];
  valueAttributes: LmrPivotValueAttribute[];
}

export enum LmrPivotConfigVersion {
  V1 = '1',
}

export interface LmrPivotAttribute extends QueryAttribute {}

export interface LmrPivotRowColumnAttribute extends LmrPivotAttribute {
  showSums?: boolean;
  sticky?: boolean;
  sort?: LmrPivotSort;
}

export interface LmrPivotRowAttribute extends LmrPivotRowColumnAttribute {}

export interface LmrPivotColumnAttribute extends LmrPivotRowColumnAttribute {}

export interface LmrPivotSortValue {
  title: string;
  isSummary?: boolean;
}

export interface LmrPivotSortList {
  valueTitle: string;
  values: LmrPivotSortValue[];
}

export interface LmrPivotSort {
  attribute?: LmrPivotAttribute;
  list?: LmrPivotSortList;
  asc: boolean;
}

export enum LmrPivotValueType {
  Default = 'default',
  ColumnPercentage = 'column',
  RowPercentage = 'row',
  AllPercentage = 'all',
}

export interface LmrPivotValueAttribute extends LmrPivotAttribute {
  aggregation: DataAggregationType;
  valueType?: LmrPivotValueType;
}
