import {DataAggregationType, QueryAttribute, QueryStem} from '@lumeer/data-filters';

export interface PivotConfig {
  version?: PivotConfigVersion;
  stemsConfigs: PivotStemConfig[];
  mergeTables?: boolean;
}

export interface PivotStemConfig {
  stem?: QueryStem;
  rowAttributes: PivotRowAttribute[];
  columnAttributes: PivotColumnAttribute[];
  valueAttributes: PivotValueAttribute[];
}

export enum PivotConfigVersion {
  V1 = '1',
}

export interface PivotAttribute extends QueryAttribute {}

export interface PivotRowColumnAttribute extends PivotAttribute {
  showSums?: boolean;
  sticky?: boolean;
  sort?: PivotSort;
}

export interface PivotRowAttribute extends PivotRowColumnAttribute {}

export interface PivotColumnAttribute extends PivotRowColumnAttribute {}

export interface PivotSortValue {
  title: string;
  isSummary?: boolean;
}

export interface PivotSortList {
  valueTitle: string;
  values: PivotSortValue[];
}

export interface PivotSort {
  attribute?: PivotAttribute;
  list?: PivotSortList;
  asc: boolean;
}

export enum PivotValueType {
  Default = 'default',
  ColumnPercentage = 'column',
  RowPercentage = 'row',
  AllPercentage = 'all',
}

export interface PivotValueAttribute extends PivotAttribute {
  aggregation: DataAggregationType;
  valueType?: PivotValueType;
}
