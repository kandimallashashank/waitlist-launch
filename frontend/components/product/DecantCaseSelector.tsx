'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Minus, Plus } from 'lucide-react';

export interface DecantInventoryItem {
  id: string;
  perfume_id: string;
  size_ml: number;
  color_name: string;
  color_hex: string;
  quantity_in_stock: number;
  total_sold: number;
  price?: number;
}

export interface SelectedCase {
  size_ml: number;
  color_name: string;
  color_hex: string;
  price: number;
  label: string;
  quantity: number;
}

interface DecantCaseSelectorProps {
  inventory: DecantInventoryItem[];
  onSelectionChange?: (cases: SelectedCase[]) => void;
  /** For kits: suggest this many cases by default */
  suggestedCount?: number;
}

/** UI shows 10ml when inventory rows still use 12 (API unchanged). */
function decantCaseDisplayMl(sizeMl: number): number {
  return sizeMl === 12 ? 10 : sizeMl;
}

interface SizeGroup {
  size_ml: number;
  label: string;
  price: number;
  colors: { name: string; hex: string; inStock: boolean; sold: number }[];
  totalSold: number;
}

export default function DecantCaseSelector({ inventory, onSelectionChange, suggestedCount }: DecantCaseSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Record<number, { color: string; qty: number } | null>>({});

  const effectiveInventory = inventory;

  const sizeGroups = useMemo<SizeGroup[]>(() => {
    const map = new Map<number, SizeGroup>();
    for (const item of effectiveInventory) {
      let group = map.get(item.size_ml);
      if (!group) {
        group = {
          size_ml: item.size_ml,
          label: `${decantCaseDisplayMl(item.size_ml)}ml Decant Case`,
          price: item.price || 199,
          colors: [],
          totalSold: 0,
        };
        map.set(item.size_ml, group);
      }
      group.colors.push({
        name: item.color_name,
        hex: item.color_hex,
        inStock: item.quantity_in_stock > 0,
        sold: item.total_sold,
      });
      group.totalSold += item.total_sold;
    }
    return Array.from(map.values()).sort((a, b) => a.size_ml - b.size_ml);
  }, [effectiveInventory]);

  // Notify parent when selections change
  const notifyParent = useCallback((cases: Record<number, { color: string; qty: number } | null>) => {
    if (!onSelectionChange) return;
    const result: SelectedCase[] = [];
    for (const [sizeMl, sel] of Object.entries(cases)) {
      if (!sel || sel.qty <= 0) continue;
      const group = sizeGroups.find(g => g.size_ml === Number(sizeMl));
      if (!group) continue;
      const color = group.colors.find(c => c.name === sel.color);
      result.push({
        size_ml: group.size_ml,
        color_name: sel.color,
        color_hex: color?.hex || '#ccc',
        price: group.price,
        label: group.label,
        quantity: sel.qty,
      });
    }
    onSelectionChange(result);
  }, [sizeGroups, onSelectionChange]);

  useEffect(() => {
    notifyParent(selectedCases);
  }, [selectedCases, notifyParent]);

  const totalCases = Object.values(selectedCases).reduce((sum, s) => sum + (s?.qty || 0), 0);

  // Hide the selector if global inventory hasn't been set up in the admin yet
  if (sizeGroups.length === 0) return null;

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex w-full items-start justify-between gap-3 px-5 pb-5 pt-4 text-left transition-colors ${
          open ? 'bg-white' : 'bg-neutral-50 hover:bg-neutral-100/60'
        }`}
      >
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-sm font-semibold text-neutral-900">Add a Decant Case</p>
          {totalCases > 0 ? (
            <p className="mt-0.5 text-xs font-medium text-[#B85A3A]">
              {totalCases} {totalCases === 1 ? 'case' : 'cases'} selected
            </p>
          ) : (
            !open && (
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                Optional reusable, swap samples in &amp; out
              </p>
            )
          )}
        </div>
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
            open ? 'bg-neutral-100' : 'bg-neutral-200'
          }`}
        >
          <ChevronDown className={`w-3.5 h-3.5 text-neutral-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100">
          {/* Reusable tip */}
          <div className="px-5 py-2.5 bg-[#FDF6F3] border-b border-neutral-100">
            <p className="text-[11px] text-[#5C5A52] leading-relaxed">
              <span className="font-semibold text-[#B85A3A]">Tip:</span> Each case is reusable finish a sample, swap in a new one. One case works for multiple fragrances!
              {suggestedCount && suggestedCount > 1 && (
                <span className="block mt-0.5">Your kit has {suggestedCount} samples. You may only need 1-2 cases.</span>
              )}
            </p>
          </div>

          {sizeGroups.map((group, idx) => {
            const sel = selectedCases[group.size_ml];
            const isChecked = sel !== null && sel !== undefined && sel.qty > 0;
            const selectedColor = sel?.color ?? null;
            const qty = sel?.qty || 0;
            const allSoldOut = group.colors.every(c => !c.inStock);
            const activeHex = group.colors.find(c => c.name === selectedColor)?.hex ?? '#ccc';

            const toggleSize = () => {
              setSelectedCases(prev => ({
                ...prev,
                [group.size_ml]: isChecked ? null : { color: group.colors.find(c => c.inStock)?.name ?? '', qty: 1 },
              }));
            };

            const setQty = (newQty: number) => {
              if (newQty <= 0) {
                setSelectedCases(prev => ({ ...prev, [group.size_ml]: null }));
              } else {
                setSelectedCases(prev => ({
                  ...prev,
                  [group.size_ml]: { color: sel?.color || group.colors.find(c => c.inStock)?.name || '', qty: newQty },
                }));
              }
            };

            return (
              <div
                key={group.size_ml}
                className={`px-5 py-4 transition-colors ${idx > 0 ? 'border-t border-neutral-100' : ''} ${
                  allSoldOut ? 'opacity-50' : isChecked ? 'bg-[#FDF6F3]' : 'hover:bg-neutral-50/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    disabled={allSoldOut}
                    onClick={toggleSize}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      isChecked ? 'bg-[#B85A3A] border-[#B85A3A]' : 'border-neutral-300 bg-white'
                    } ${allSoldOut ? 'cursor-not-allowed' : ''}`}
                  >
                    {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>

                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden">
                    <div
                      style={{
                        width: 30, height: 38, borderRadius: 6,
                        background: isChecked
                          ? `linear-gradient(160deg, ${activeHex}cc 0%, ${activeHex} 100%)`
                          : 'linear-gradient(160deg, #e5e5e5 0%, #c0c0c0 100%)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                        transition: 'background 0.35s',
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{group.label}</p>
                        {group.totalSold > 0 && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">{group.totalSold} sold</p>
                        )}
                      </div>
                      {allSoldOut ? (
                        <span className="flex-shrink-0 text-[10px] font-bold bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full">
                          Sold Out
                        </span>
                      ) : isChecked ? (
                        <div className="flex-shrink-0 text-right">
                          <p className="text-base font-bold tabular-nums text-neutral-900">
                            ₹{(group.price * qty).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[11px] font-medium text-neutral-500">
                            {qty} × ₹{group.price.toLocaleString('en-IN')}
                          </p>
                        </div>
                      ) : (
                        <p className="flex-shrink-0 text-sm font-bold tabular-nums text-neutral-900">
                          ₹{group.price.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>

                    {!allSoldOut && (
                      <>
                        {/* Colour swatches */}
                        <div className="flex items-center gap-2 mb-2">
                          {group.colors.map((color) => {
                            const isActive = selectedColor === color.name;
                            return (
                              <button
                                key={color.name}
                                type="button"
                                title={`${color.name}${!color.inStock ? ' (Sold out)' : ''}`}
                                disabled={!color.inStock}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCases(prev => ({
                                    ...prev,
                                    [group.size_ml]: { color: color.name, qty: Math.max(1, sel?.qty || 1) },
                                  }));
                                }}
                                className={`w-5 h-5 rounded-full border-[2.5px] transition-all duration-150 ${
                                  !color.inStock
                                    ? 'opacity-30 cursor-not-allowed border-neutral-300'
                                    : isActive
                                    ? 'border-[#B85A3A] scale-110 shadow-md ring-2 ring-[#B85A3A]/20'
                                    : 'border-neutral-300 hover:scale-110 hover:border-neutral-400'
                                }`}
                                style={{ backgroundColor: color.hex }}
                              />
                            );
                          })}
                          {selectedColor && (
                            <span className="ml-0.5 text-[11px] font-medium text-neutral-500">{selectedColor}</span>
                          )}
                        </div>

                        {/* Quantity controls */}
                        {isChecked && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-medium text-neutral-500">Qty</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setQty(qty - 1); }}
                              className="w-6 h-6 rounded-md border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                            >
                              <Minus className="w-3 h-3 text-neutral-600" />
                            </button>
                            <span className="w-5 text-center text-sm font-semibold tabular-nums text-neutral-900">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setQty(qty + 1); }}
                              className="w-6 h-6 rounded-md border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                            >
                              <Plus className="w-3 h-3 text-neutral-600" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
