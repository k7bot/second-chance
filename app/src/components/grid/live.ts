"use client";
import { useEffect, useRef } from "react";
import type { GridApi, IRowNode } from "ag-grid-community";

/**
 * Streams new server data into a grid as an explicit transaction (add / update / remove) instead of
 * replacing rowData, so sort, filter, grouping, expanded rows and scroll survive every webhook.
 * Changed cells flash via enableCellChangeFlash; brand-new rows get a whole-row flash.
 */
export function useLiveRows<T extends { id: string }>(api: GridApi<T> | null, rows: T[] | undefined, onAdded?: (rows: T[]) => void) {
  const prev = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    if (!api || !rows || api.isDestroyed()) return;
    const next = new Map(rows.map((r) => [r.id, JSON.stringify(r)] as const));
    if (!prev.current) {
      api.setGridOption("rowData", rows);
      prev.current = next;
      return;
    }
    const before = prev.current;
    const add: T[] = [], update: T[] = [], remove: T[] = [];
    for (const r of rows) {
      const old = before.get(r.id);
      if (old === undefined) add.push(r);
      else if (old !== next.get(r.id)) update.push(r);
    }
    for (const id of before.keys()) if (!next.has(id)) remove.push({ id } as T);
    prev.current = next;
    if (!add.length && !update.length && !remove.length) return;
    api.applyTransactionAsync({ add, update, remove, addIndex: 0 }, (res) => {
      if (res.add.length) {
        api.flashCells({ rowNodes: res.add as IRowNode<T>[], flashDuration: 1600, fadeDuration: 900 });
        onAdded?.(add);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, rows]);
}
