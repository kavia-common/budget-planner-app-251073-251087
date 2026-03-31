import React, { useMemo, useState } from 'react';
import { addUserCategory, getFixedCategories, loadUserCategories, removeUserCategory } from '../services/categoriesStorage';

/**
 * @file CategoryManager.js
 * Simple UI for managing user-defined categories.
 */

/**
 * CategoryManager component.
 *
 * PUBLIC_INTERFACE
 * @param {{
 *  onCategoriesChanged?: () => void,
 * }} props
 * @returns {JSX.Element}
 */
export function CategoryManager({ onCategoriesChanged }) {
  /** This is a public function. */
  const fixed = useMemo(() => getFixedCategories(), []);
  const [userCats, setUserCats] = useState(() => loadUserCategories());
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  function refresh() {
    setUserCats(loadUserCategories());
    if (onCategoriesChanged) onCategoriesChanged();
  }

  function handleAdd(e) {
    e.preventDefault();
    setError('');
    const res = addUserCategory(draft);
    if (!res.ok) {
      setError(res.error || 'Unable to add category.');
      return;
    }
    setDraft('');
    refresh();
  }

  function handleRemove(name) {
    setError('');
    const res = removeUserCategory(name);
    if (!res.ok) {
      setError(res.error || 'Unable to remove category.');
      return;
    }
    refresh();
  }

  return (
    <section className="cat-panel" aria-label="Category management">
      <header className="cat-panel__header">
        <h2 className="cat-panel__title">Categories</h2>
        <p className="cat-panel__subtitle">Fixed + your own (saved to this browser).</p>
      </header>

      <div className="cat-panel__cols">
        <div className="cat-panel__col">
          <h3 className="cat-panel__colTitle">Fixed</h3>
          <ul className="cat-list" aria-label="Fixed categories">
            {fixed.map((c) => (
              <li key={c} className="cat-list__item">
                <span className="cat-pill">{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cat-panel__col">
          <h3 className="cat-panel__colTitle">Yours</h3>

          <form className="cat-add" onSubmit={handleAdd}>
            <label className="sr-only" htmlFor="cat_add_input">
              New category name
            </label>
            <input
              id="cat_add_input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a category…"
              maxLength={32}
            />
            <button type="submit" className="cat-btn">
              Add
            </button>
          </form>

          {error ? (
            <div className="cat-error" role="alert">
              {error}
            </div>
          ) : null}

          {userCats.length === 0 ? (
            <div className="cat-empty">No custom categories yet.</div>
          ) : (
            <ul className="cat-list" aria-label="User categories">
              {userCats.map((c) => (
                <li key={c} className="cat-list__item cat-list__item--row">
                  <span className="cat-pill cat-pill--user">{c}</span>
                  <button
                    type="button"
                    className="cat-btn cat-btn--danger"
                    onClick={() => handleRemove(c)}
                    aria-label={`Remove category ${c}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
