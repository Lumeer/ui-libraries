import {Constraint, DataAggregationType, QueryAttribute, QueryStem} from '@lumeer/data-filters';
import {LmrPivotDataHeader} from './lmr-pivot-data';

export interface LmrPivotConfig {
  version?: LmrPivotConfigVersion;
  stemsConfigs: LmrPivotStemConfig[];
  mergeTables?: boolean;
}

export interface LmrPivotTransform {
  checkValidConstraintOverride?: (c1: Constraint, c2: Constraint) => Constraint;
  formatAggregation?: (type: DataAggregationType) => string;
  formatSummaryHeader?: (header: LmrPivotDataHeader, level: number) => {title?: string; summary: string};
  formatRowHeader?: (title: string, level: number) => string;
  formatColumnHeader?: (title: string, level: number) => string;
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
  expressions?: LmrPivotExpression[];
}

export interface LmrPivotRowAttribute extends LmrPivotRowColumnAttribute {
  showHeader?: boolean;
}

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

export interface LmrPivotExpression {
  operation: LmrPivotExpressionOperation;
  operands: LmrPivotOperand[];
  title: string;
  type: 'expression';
  position: LmrPivotPosition;
  expandable?: boolean;
}

export enum LmrPivotPosition {
  BeforeHeader = 'beforeHeader',
  StickToEnd = 'stickToEnd',
}

export type LmrPivotExpressionOperation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface LmrPivotHeaderOperand {
  type: 'header';
  value: string;
}

export interface LmrPivotValueOperand {
  type: 'value';
  value: number;
}

export type LmrPivotOperand = LmrPivotHeaderOperand | LmrPivotValueOperand | LmrPivotExpression;
