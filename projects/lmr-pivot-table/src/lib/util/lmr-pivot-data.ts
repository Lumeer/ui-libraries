/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Lumeer.io, s.r.o. and/or its affiliates.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import {Constraint, ConstraintData, DataAggregationType, DataResource} from '@lumeer/data-filters';
import {LmrPivotSort, LmrPivotValueType} from './lmr-pivot-config';

export interface LmrPivotData {
  data: LmrPivotStemData[];

  constraintData?: ConstraintData;
  mergeTables?: boolean;
  ableToMerge?: boolean;
}

export interface LmrPivotStemData {
  columnHeaders: LmrPivotDataHeader[];
  columnHeaderAttributes: LmrPivotHeaderAttribute[];
  rowHeaders: LmrPivotDataHeader[];
  rowHeaderAttributes: LmrPivotHeaderAttribute[];
  valueTitles: string[];
  values: any[][];
  dataResources: DataResource[][][];
  valuesConstraints?: Constraint[];
  valueTypes?: LmrPivotValueType[];
  valueAggregations?: DataAggregationType[];

  rowShowSums: boolean[];
  rowSticky: boolean[];
  rowSorts?: LmrPivotSort[];
  columnShowSums: boolean[];
  columnSticky: boolean[];
  columnSorts?: LmrPivotSort[];
  hasAdditionalColumnLevel?: boolean;
}

export interface LmrPivotHeaderAttribute {
  title: string;
  color: string;
}

export interface LmrPivotDataHeader {
  title: string;
  children?: LmrPivotDataHeader[];
  targetIndex?: number;
  color: string;
  isValueHeader: boolean;
  constraint?: Constraint;
  attributeName?: string;
}
