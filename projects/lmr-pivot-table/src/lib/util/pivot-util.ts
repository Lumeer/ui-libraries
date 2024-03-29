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

import {cleanQueryAttribute, Query, QueryStem} from '@lumeer/data-filters';
import {deepObjectsEquals, hex2rgba} from '@lumeer/utils';
import {LmrPivotAttribute, LmrPivotConfig, LmrPivotConfigVersion, LmrPivotRowAttribute, LmrPivotStemConfig} from './lmr-pivot-config';
import {COLOR_LIGHT, COLOR_PRIMARY} from './lmr-pivot-constants';

export function pivotAttributesAreSame(a1: LmrPivotAttribute, a2: LmrPivotAttribute): boolean {
  return deepObjectsEquals(cleanQueryAttribute(a1), cleanQueryAttribute(a2));
}

export function isPivotConfigChanged(viewConfig: LmrPivotConfig, currentConfig: LmrPivotConfig): boolean {
  if (!!viewConfig?.mergeTables !== !!currentConfig?.mergeTables && (currentConfig?.stemsConfigs || []).length > 1) {
    return true;
  }

  return pivotStemConfigsHasChanged(viewConfig?.stemsConfigs || [], currentConfig?.stemsConfigs || []);
}

function pivotStemConfigsHasChanged(s1: LmrPivotStemConfig[], s2: LmrPivotStemConfig[]): boolean {
  if (s1.length !== s2.length) {
    return true;
  }

  return s1.some((stemConfig, index) => pivotStemConfigHasChanged(stemConfig, s2[index]));
}

function pivotStemConfigHasChanged(s1: LmrPivotStemConfig, s2: LmrPivotStemConfig): boolean {
  return (
    !deepObjectsEquals(cleanRowAttributes(s1.rowAttributes), cleanRowAttributes(s2.rowAttributes)) ||
    !deepObjectsEquals(s1.columnAttributes || [], s2.columnAttributes || []) ||
    !deepObjectsEquals(s1.valueAttributes || [], s2.valueAttributes || [])
  );
}

function cleanRowAttributes(attrs: LmrPivotRowAttribute[]): LmrPivotRowAttribute[] {
  return (attrs || []).map(attr => ({...attr, showHeader: undefined}))
}

export function createDefaultPivotConfig(query: Query): LmrPivotConfig {
  const stems = (query && query.stems) || [];
  const stemsConfigs = stems.map(stem => createDefaultPivotStemConfig(stem));
  return {version: LmrPivotConfigVersion.V1, stemsConfigs: stemsConfigs, mergeTables: true};
}

export function createDefaultPivotStemConfig(stem?: QueryStem): LmrPivotStemConfig {
  return {stem, rowAttributes: [], columnAttributes: [], valueAttributes: []};
}

export function pivotConfigIsEmpty(config: LmrPivotConfig): boolean {
  return (config.stemsConfigs || []).every(stemConfig => pivotStemConfigIsEmpty(stemConfig));
}

export function pivotStemConfigIsEmpty(config: LmrPivotStemConfig): boolean {
  return (
    ((config && config.rowAttributes) || []).length === 0 &&
    ((config && config.columnAttributes) || []).length === 0 &&
    ((config && config.valueAttributes) || []).length === 0
  );
}

export function contrastColor(color: string, returnCodes?: {dark: string; light: string}, opacity?: number): string {
  if (!color) {
    return returnCodes ? returnCodes.dark : COLOR_PRIMARY;
  }

  const f = parseInt(color.indexOf('#') === 0 ? color.slice(1) : color, 16),
    R = f >> 16,
    G = (f >> 8) & 0x00ff,
    B = f & 0x0000ff;

  const luminance = (0.299 * R + 0.587 * G + 0.114 * B) / 255;

  if (luminance > 0.5) {
    return returnCodes ? returnCodes.dark : hex2rgba(COLOR_PRIMARY, opacity || 1);
  } else {
    return returnCodes ? returnCodes.light : hex2rgba(COLOR_LIGHT, opacity || 1);
  }
}
