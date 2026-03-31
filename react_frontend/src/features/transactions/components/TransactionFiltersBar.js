import React, { useId, useMemo } from 'react';

/**
 * @file TransactionFiltersBar.js
 * UI controls for searching/sorting and applying multiple filters to transactions.
 */

/**
 * TransactionFiltersBar component.
 *
 * PUBLIC_INTERFACE
 * @param {{
 *  filters: import('../utils/transactionFilters').TransactionMultiFilters,
 *  onChange: (next: import('../utils/transactionFilters').TransactionMultiFilters) => void,
 *  availableCategories: string[],
 * }} props
 * @returns {JSX.Element}
 */
export function TransactionFiltersBar({ filters, onChange, availableCategories }) {
  /** This is a public function. */
  const reactId = useId();

  const searchId = useMemo(() => `txf_search_${reactId}`, [reactId]);
  const sortId = useMemo(() => `txf_sort_${reactId}`, [reactId]);
  const typeId = useMemo(() => `txf_type_${reactId}`, [reactId]);

  const minAmtId = useMemo(() => `txf_min_${reactId}`, [reactId]);
  const maxAmtId = useMemo(() => `txf_max_${reactId}`, [reactId]);

  const startDateId = useMemo(() => `txf_start_${reactId}`, [reactId]);
  const endDateId = useMemo(() => `txf_end_${reactId}`, [reactId]);

  const categoriesId = useMemo(() => `txf_cats_${reactId}`, [reactId]);

  const selectedCategories = filters?.categories || [];
  const selectedSet = useMemo(() => new Set(selectedCategories), [selectedCategories]);

  function patch(p) {
    onChange({ ...filters, ...p });
  }

  return (
    <section className="tx-filters" aria-label="Transaction filters">
      <div className="tx-filters-row">
        <div className="tx-filter-field">
          <label htmlFor={searchId}>Search</label>
          <input
            id={searchId}
            type="text"
            value={filters.searchText}
            onChange={(e) => patch({ searchText: e.target.value })}
            placeholder="Category or note…"
          />
        </div>

        <div className="tx-filter-field">
          <label htmlFor={sortId}>Sort</label>
          <select id={sortId} value={filters.sort} onChange={(e) => patch({ sort: e.target.value })}>
            <option value="date_desc">Date ↓</option>
            <option value="date_asc">Date ↑</option>
            <option value="amount_desc">Amount ↓</option>
            <option value="amount_asc">Amount ↑</option>
          </select>
        </div>

        <div className="tx-filter-field">
          <label htmlFor={typeId}>Type</label>
          <select id={typeId} value={filters.type} onChange={(e) => patch({ type: e.target.value })}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </div>

      <div className="tx-filters-row">
        <div className="tx-filter-field">
          <label htmlFor={minAmtId}>Min $</label>
          <input
            id={minAmtId}
            inputMode="decimal"
            type="text"
            value={filters.minAmount}
            onChange={(e) => patch({ minAmount: e.target.value })}
            placeholder="e.g. 10"
          />
        </div>

        <div className="tx-filter-field">
          <label htmlFor={maxAmtId}>Max $</label>
          <input
            id={maxAmtId}
            inputMode="decimal"
            type="text"
            value={filters.maxAmount}
            onChange={(e) => patch({ maxAmount: e.target.value })}
            placeholder="e.g. 200"
          />
        </div>

        <div className="tx-filter-field">
          <label htmlFor={startDateId}>From</label>
          <input
            id={startDateId}
            type="date"
            value={filters.startDate}
            onChange={(e) => patch({ startDate: e.target.value })}
          />
        </div>

        <div className="tx-filter-field">
          <label htmlFor={endDateId}>To</label>
          <input
            id={endDateId}
            type="date"
            value={filters.endDate}
            onChange={(e) => patch({ endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="tx-filters-row">
        <div className="tx-filter-field tx-filter-field-wide">
          <label htmlFor={categoriesId}>Categories</label>
          <select
            id={categoriesId}
            multiple
            value={selectedCategories}
            onChange={(e) => {
              const next = Array.from(e.target.selectedOptions).map((o) => o.value);
              patch({ categories: next });
            }}
            aria-describedby={`${categoriesId}_hint`}
          >
            {(availableCategories || []).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <small id={`${categoriesId}_hint`} className="tx-filter-hint">
            Tip: Ctrl/Cmd+Click to select multiple.
          </small>
        </div>

        <div className="tx-filter-actions" aria-label="Filter actions">
          <button
            type="button"
            className="tx-filter-btn"
            onClick={() => patch({ categories: [] })}
            disabled={selectedSet.size === 0}
          >
            Clear categories
          </button>
          <button
            type="button"
            className="tx-filter-btn"
            onClick={() =>
              onChange({
                ...filters,
                searchText: '',
                type: 'all',
                categories: [],
                minAmount: '',
                maxAmount: '',
                startDate: '',
                endDate: '',
                sort: 'date_desc',
              })
            }
          >
            Reset all
          </button>
        </div>
      </div>
    </section>
  );
}
