import {LmrPivotColumnAttribute, LmrPivotRowAttribute, LmrPivotValueAttribute} from './lmr-pivot-config';

export interface LmrSimplePivotConfig {
  rowAttributes: LmrSimplePivotRowAttribute[];
  columnAttributes: LmrSimplePivotColumnAttribute[];
  valueAttributes: LmrSimplePivotValueAttribute[];
}

export type LmrSimplePivotRowAttribute = Omit<LmrPivotRowAttribute, 'resourceType' | 'resourceId' | 'resourceIndex'>
export type LmrSimplePivotColumnAttribute = Omit<LmrPivotColumnAttribute, 'resourceType' | 'resourceId' | 'resourceIndex'>
export type LmrSimplePivotValueAttribute = Omit<LmrPivotValueAttribute, 'resourceType' | 'resourceId' | 'resourceIndex'>
