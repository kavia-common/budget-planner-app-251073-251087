/**
 * @file categoriesStorage.js
 * localStorage-backed storage for category names used by the legacy transaction UI.
 *
 * We keep this separate from the richer AppState entity store until the UI is fully migrated.
 * This step (06.01) implements:
 * - fixed default categories (seed)
 * - user-defined categories persisted in localStorage
 * - normalization/deduping helpers
 */

const USER_CATEGORIES_KEY = 'bp_user_categories_v1';

/**
 * Fixed seed categories that always exist (cannot be removed).
 * These match the legacy UI categories currently used elsewhere.
 */
const FIXED_CATEGORIES = Object.freeze([
  'Groceries',
  'Rent',
  'Utilities',
  'Transportation',
  'Dining',
  'Salary',
  'Miscellaneous',
]);

/**
 * Normalize a category name for display/storage.
 * - trims
 * - collapses whitespace
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeCategoryName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Case-insensitive uniqueness key for category names.
 * @param {string} name
 * @returns {string}
 */
function categoryKey(name) {
  return normalizeCategoryName(name).toLowerCase();
}

/**
 * Safely parse JSON.
 * @param {string} raw
 * @returns {any|null}
 */
function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Load user-defined categories from localStorage.
 *
 * PUBLIC_INTERFACE
 * @returns {string[]} Sorted, de-duped category names.
 */
export function loadUserCategories() {
  /** This is a public function. */
  try {
    const raw = window.localStorage.getItem(USER_CATEGORIES_KEY);
    const parsed = safeJsonParse(raw || '');
    const arr = Array.isArray(parsed) ? parsed : [];

    const seen = new Set();
    const out = [];
    for (const item of arr) {
      const normalized = normalizeCategoryName(item);
      if (!normalized) continue;
      const k = categoryKey(normalized);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(normalized);
    }

    out.sort((a, b) => a.localeCompare(b));
    return out;
  } catch {
    return [];
  }
}

/**
 * Save user-defined categories to localStorage.
 *
 * PUBLIC_INTERFACE
 * @param {string[]} categories
 */
export function saveUserCategories(categories) {
  /** This is a public function. */
  try {
    const cleaned = (Array.isArray(categories) ? categories : [])
      .map(normalizeCategoryName)
      .filter(Boolean);

    const seen = new Set();
    const uniq = [];
    for (const c of cleaned) {
      const k = categoryKey(c);
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(c);
    }

    uniq.sort((a, b) => a.localeCompare(b));
    window.localStorage.setItem(USER_CATEGORIES_KEY, JSON.stringify(uniq));
  } catch {
    // Ignore quota/private mode errors
  }
}

/**
 * Return the merged list of categories:
 * - fixed defaults
 * - user-defined categories (localStorage)
 * - optionally categories observed in existing transactions (to avoid "orphaned" categories)
 *
 * PUBLIC_INTERFACE
 * @param {string[]=} observedFromTransactions
 * @returns {string[]} Sorted, de-duped list.
 */
export function getAllCategories(observedFromTransactions = []) {
  /** This is a public function. */
  const fixed = FIXED_CATEGORIES;
  const user = loadUserCategories();
  const observed = Array.isArray(observedFromTransactions) ? observedFromTransactions : [];

  const seen = new Set();
  const merged = [];

  const push = (c) => {
    const normalized = normalizeCategoryName(c);
    if (!normalized) return;
    const k = categoryKey(normalized);
    if (seen.has(k)) return;
    seen.add(k);
    merged.push(normalized);
  };

  fixed.forEach(push);
  user.forEach(push);
  observed.forEach(push);

  merged.sort((a, b) => a.localeCompare(b));
  return merged;
}

/**
 * Add a new user-defined category.
 * If it already exists (case-insensitive), it's a no-op.
 * Fixed categories don't need to be stored as user categories.
 *
 * PUBLIC_INTERFACE
 * @param {string} name
 * @returns {{ok: boolean, error?: string}}
 */
export function addUserCategory(name) {
  /** This is a public function. */
  const normalized = normalizeCategoryName(name);
  if (!normalized) return { ok: false, error: 'Category name is required.' };
  if (normalized.length > 32) return { ok: false, error: 'Category name must be 32 characters or fewer.' };

  const fixedSet = new Set(FIXED_CATEGORIES.map((c) => categoryKey(c)));
  const k = categoryKey(normalized);

  // If it's already in fixed, no need to add; consider success.
  if (fixedSet.has(k)) return { ok: true };

  const current = loadUserCategories();
  const currentSet = new Set(current.map((c) => categoryKey(c)));
  if (currentSet.has(k)) return { ok: true };

  const next = [...current, normalized];
  saveUserCategories(next);
  return { ok: true };
}

/**
 * Remove a user-defined category. Fixed categories cannot be removed.
 *
 * PUBLIC_INTERFACE
 * @param {string} name
 * @returns {{ok: boolean, error?: string}}
 */
export function removeUserCategory(name) {
  /** This is a public function. */
  const normalized = normalizeCategoryName(name);
  if (!normalized) return { ok: false, error: 'Category name is required.' };

  const fixedSet = new Set(FIXED_CATEGORIES.map((c) => categoryKey(c)));
  const k = categoryKey(normalized);
  if (fixedSet.has(k)) return { ok: false, error: 'Fixed categories cannot be removed.' };

  const current = loadUserCategories();
  const next = current.filter((c) => categoryKey(c) !== k);
  saveUserCategories(next);
  return { ok: true };
}

/**
 * Return the fixed categories list.
 *
 * PUBLIC_INTERFACE
 * @returns {string[]}
 */
export function getFixedCategories() {
  /** This is a public function. */
  return [...FIXED_CATEGORIES];
}

export const __testing__ = {
  normalizeCategoryName,
  categoryKey,
};
