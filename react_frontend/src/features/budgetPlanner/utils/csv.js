import { loadLegacyTransactions, saveLegacyTransactions } from '../../../services/storage/localStorage';
import { getFixedCategories, loadUserCategories, saveUserCategories } from '../../categories/services/categoriesStorage';
import { loadBudgets } from '../../budgets/services/budgetsStorage';

/**
 * @file csv.js
 * CSV import/export utilities for the legacy (localStorage-backed) app.
 *
 * Goals:
 * - Keep everything localStorage-only (no backend).
 * - Provide validation + preview before writing.
 * - Support merge vs replace behavior.
 *
 * CSV Format (header row required):
 * id,date,type,amount,category,note,recurringEnabled,recurringFrequency,recurringInterval,recurringStartDate,recurringEndDate
 *
 * Notes:
 * - amount is in dollars (number). We keep legacy shape: {amount:number} dollars.
 * - type is 'income' | 'expense'
 * - recurring fields are optional; the app already supports recurring transactions.
 */

const TX_HEADER = Object.freeze([
    'id',
    'date',
    'type',
    'amount',
    'category',
    'note',
    'recurringEnabled',
    'recurringFrequency',
    'recurringInterval',
    'recurringStartDate',
    'recurringEndDate',
]);

/**
 * @typedef {'transactions'|'categories'|'budgets'} CsvDatasetType
 */

/**
 * Minimal CSV line parser supporting:
 * - commas as separators
 * - quoted fields with "" escapes
 * - \n line breaks
 *
 * PUBLIC_INTERFACE
 * @param {string} text
 * @returns {string[][]} rows
 */
export function parseCsv(text) {
    /** This is a public function. */
    const s = String(text || '');
    /** @type {string[][]} */
    const rows = [];

    let row = [];
    let field = '';
    let inQuotes = false;

    const pushField = () => {
        row.push(field);
        field = '';
    };
    const pushRow = () => {
        // Ignore completely empty trailing line.
        if (row.length === 1 && row[0] === '' && rows.length > 0) return;
        rows.push(row);
        row = [];
    };

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];

        if (inQuotes) {
            if (ch === '"') {
                const next = s[i + 1];
                if (next === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            continue;
        }

        if (ch === ',') {
            pushField();
            continue;
        }

        if (ch === '\n') {
            pushField();
            pushRow();
            continue;
        }

        if (ch === '\r') {
            // ignore, handle \r\n
            continue;
        }

        field += ch;
    }

    // last field/row
    pushField();
    pushRow();

    // If the file is empty, return []
    if (rows.length === 1 && rows[0].length === 1 && rows[0][0] === '') return [];
    return rows;
}

/**
 * Escape a value for CSV.
 * @param {any} value
 * @returns {string}
 */
function csvEscape(value) {
    const raw = value === null || value === undefined ? '' : String(value);
    const needsQuotes = /[",\n\r]/.test(raw);
    if (!needsQuotes) return raw;
    return `"${raw.replace(/"/g, '""')}"`;
}

/**
 * Convert rows to CSV string (always includes header row).
 * @param {string[]} header
 * @param {Array<Record<string, any>>} records
 * @returns {string}
 */
function toCsv(header, records) {
    const lines = [];
    lines.push(header.map(csvEscape).join(','));
    for (const r of records || []) {
        lines.push(header.map((h) => csvEscape(r?.[h])).join(','));
    }
    return `${lines.join('\n')}\n`;
}

/**
 * Normalize/validate an imported transaction row into the legacy shape used by the app.
 * @param {Record<string,string>} row
 * @param {number} rowIndex 1-based index in data rows (excluding header)
 * @returns {{ok:true, tx:any}|{ok:false, error:string}}
 */
function normalizeImportedTransactionRow(row, rowIndex) {
    const date = String(row.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) {
        return { ok: false, error: `Row ${rowIndex}: invalid date (expected YYYY-MM-DD), got "${row.date || ''}".` };
    }

    const type = String(row.type || '').trim().toLowerCase();
    if (type !== 'income' && type !== 'expense') {
        return { ok: false, error: `Row ${rowIndex}: invalid type (expected income|expense), got "${row.type || ''}".` };
    }

    const amountRaw = String(row.amount || '').trim();
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, error: `Row ${rowIndex}: invalid amount (must be > 0), got "${row.amount || ''}".` };
    }

    const category = String(row.category || '').trim();
    if (!category) {
        return { ok: false, error: `Row ${rowIndex}: category is required.` };
    }

    const note = String(row.note || '').trim();

    // Recurring: optional.
    const recurringEnabledRaw = String(row.recurringEnabled || '').trim().toLowerCase();
    const recurringEnabled = recurringEnabledRaw === 'true' || recurringEnabledRaw === '1' || recurringEnabledRaw === 'yes';

    const recurringFrequencyRaw = String(row.recurringFrequency || '').trim().toLowerCase();
    const allowedFreq = new Set(['daily', 'weekly', 'monthly', 'yearly', 'custom', '']);
    if (!allowedFreq.has(recurringFrequencyRaw)) {
        return {
            ok: false,
            error: `Row ${rowIndex}: invalid recurringFrequency "${row.recurringFrequency || ''}" (allowed: daily, weekly, monthly, yearly, custom).`,
        };
    }

    const recurringIntervalRaw = String(row.recurringInterval || '').trim();
    const recurringInterval = recurringIntervalRaw ? Math.trunc(Number(recurringIntervalRaw)) : undefined;
    if (recurringIntervalRaw && (!Number.isFinite(recurringInterval) || recurringInterval <= 0 || recurringInterval > 3650)) {
        return { ok: false, error: `Row ${rowIndex}: invalid recurringInterval "${row.recurringInterval || ''}".` };
    }

    const recurringStartDate = String(row.recurringStartDate || '').trim();
    const recurringEndDate = String(row.recurringEndDate || '').trim();

    const looksLikeDate = (d) => !d || /^\d{4}-\d{2}-\d{2}/.test(d);
    if (!looksLikeDate(recurringStartDate)) {
        return { ok: false, error: `Row ${rowIndex}: invalid recurringStartDate "${row.recurringStartDate || ''}".` };
    }
    if (!looksLikeDate(recurringEndDate)) {
        return { ok: false, error: `Row ${rowIndex}: invalid recurringEndDate "${row.recurringEndDate || ''}".` };
    }

    const id = String(row.id || '').trim();

    /** @type {any} */
    const tx = {
        // Note: keep id if provided; merge strategy uses it.
        ...(id ? { id } : {}),
        date: date.slice(0, 10),
        type,
        amount,
        category,
        note,
    };

    // Only attach recurring fields if enabled OR any recurring fields exist; keeps exports stable.
    if (recurringEnabled || recurringFrequencyRaw || recurringIntervalRaw || recurringStartDate || recurringEndDate) {
        tx.recurring = {
            enabled: recurringEnabled,
            frequency: recurringFrequencyRaw || 'monthly',
            interval: recurringInterval || 1,
            startDate: recurringStartDate || '',
            endDate: recurringEndDate || '',
        };
    }

    return { ok: true, tx };
}

/**
 * Parse + validate a transactions CSV file.
 *
 * PUBLIC_INTERFACE
 * @param {string} csvText
 * @returns {{
 *   ok: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   header?: string[],
 *   transactions?: any[],
 *   inferredCategories?: string[],
 * }}
 */
export function validateTransactionsCsv(csvText) {
    /** This is a public function. */
    const rows = parseCsv(csvText);
    if (rows.length === 0) return { ok: false, errors: ['CSV is empty.'], warnings: [] };

    const header = (rows[0] || []).map((h) => String(h || '').trim());
    const headerKey = header.map((h) => h.toLowerCase());
    const required = ['date', 'type', 'amount', 'category'];

    for (const r of required) {
        if (!headerKey.includes(r)) {
            return { ok: false, errors: [`Missing required column "${r}".`], warnings: [] };
        }
    }

    const colIndex = {};
    headerKey.forEach((h, idx) => {
        if (!h) return;
        if (colIndex[h] !== undefined) return;
        colIndex[h] = idx;
    });

    const get = (row, key) => {
        const idx = colIndex[key];
        return idx === undefined ? '' : row[idx] ?? '';
    };

    /** @type {any[]} */
    const txs = [];
    /** @type {string[]} */
    const errors = [];
    /** @type {string[]} */
    const warnings = [];

    const seenIds = new Set();
    const inferredCats = new Set();

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        // Skip blank lines
        if (!r || r.every((x) => String(x || '').trim() === '')) continue;

        /** @type {Record<string,string>} */
        const record = {};
        // map known keys only (accept extras silently)
        for (const k of TX_HEADER) record[k] = String(get(r, k.toLowerCase()) ?? '');

        // Also map required keys in case header used different casing.
        record.date = String(get(r, 'date'));
        record.type = String(get(r, 'type'));
        record.amount = String(get(r, 'amount'));
        record.category = String(get(r, 'category'));
        record.note = String(get(r, 'note'));
        record.id = String(get(r, 'id'));
        record.recurringEnabled = String(get(r, 'recurringenabled'));
        record.recurringFrequency = String(get(r, 'recurringfrequency'));
        record.recurringInterval = String(get(r, 'recurringinterval'));
        record.recurringStartDate = String(get(r, 'recurringstartdate'));
        record.recurringEndDate = String(get(r, 'recurringenddate'));

        const res = normalizeImportedTransactionRow(record, i);
        if (!res.ok) {
            errors.push(res.error);
            continue;
        }

        const tx = res.tx;
        if (tx.id) {
            const k = String(tx.id);
            if (seenIds.has(k)) {
                warnings.push(`Row ${i}: duplicate id "${k}" (will be de-duplicated during merge).`);
            }
            seenIds.add(k);
        }
        inferredCats.add(String(tx.category || '').trim());

        txs.push(tx);
    }

    if (txs.length === 0) {
        return { ok: false, errors: errors.length ? errors : ['No valid transactions found.'], warnings, header };
    }

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        header,
        transactions: txs,
        inferredCategories: Array.from(inferredCats).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    };
}

/**
 * Export current transactions to CSV.
 *
 * PUBLIC_INTERFACE
 * @param {any[]} transactions
 * @returns {string}
 */
export function exportTransactionsToCsv(transactions) {
    /** This is a public function. */
    const records = (transactions || []).map((tx) => {
        const rec = {};
        for (const h of TX_HEADER) rec[h] = '';
        rec.id = tx?.id || '';
        rec.date = tx?.date || '';
        rec.type = tx?.type || '';
        rec.amount = tx?.amount ?? '';
        rec.category = tx?.category || '';
        rec.note = tx?.note || '';

        const r = tx?.recurring || {};
        rec.recurringEnabled = r?.enabled ? 'true' : '';
        rec.recurringFrequency = r?.frequency || '';
        rec.recurringInterval = r?.interval ?? '';
        rec.recurringStartDate = r?.startDate || '';
        rec.recurringEndDate = r?.endDate || '';

        return rec;
    });

    return toCsv(TX_HEADER, records);
}

/**
 * Export a full "backup" bundle as CSV-like sections.
 * This is intentionally plain text so it can be stored in git/email/etc.
 *
 * Format:
 *   # BudgetPlanner Backup v1
 *   [TRANSACTIONS]
 *   <transactions csv>
 *   [CATEGORIES]
 *   name
 *   ...
 *   [BUDGETS]
 *   id,scope,category,limitCents,warnPct,enabled,createdAtMs,updatedAtMs
 *
 * PUBLIC_INTERFACE
 * @returns {string}
 */
export function exportBackupBundleText() {
    /** This is a public function. */
    const txs = loadLegacyTransactions();
    const userCats = loadUserCategories();
    const budgets = loadBudgets();

    const txCsv = exportTransactionsToCsv(txs);

    const catHeader = ['name'];
    const catCsv = toCsv(
        catHeader,
        userCats.map((c) => ({ name: c }))
    );

    const budgetsHeader = ['id', 'scope', 'category', 'limitCents', 'warnPct', 'enabled', 'createdAtMs', 'updatedAtMs'];
    const budgetCsv = toCsv(budgetsHeader, budgets);

    return `# BudgetPlanner Backup v1
# This file contains 3 sections: TRANSACTIONS, CATEGORIES, BUDGETS.

[TRANSACTIONS]
${txCsv}
[CATEGORIES]
${catCsv}
[BUDGETS]
${budgetCsv}`;
}

/**
 * Parse the backup bundle text.
 *
 * PUBLIC_INTERFACE
 * @param {string} text
 * @returns {{
 *   ok: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   transactions?: any[],
 *   userCategories?: string[],
 *   budgets?: any[],
 * }}
 */
export function validateBackupBundleText(text) {
    /** This is a public function. */
    const s = String(text || '');
    const errors = [];
    const warnings = [];

    const findSection = (name) => {
        const marker = `[${name}]`;
        const idx = s.indexOf(marker);
        if (idx < 0) return null;
        const after = s.slice(idx + marker.length);
        // section ends at next [SOMETHING] marker or EOF
        const nextMarkerIdx = after.search(/\n\[[A-Z]+\]\n/);
        if (nextMarkerIdx < 0) return after.trim();
        return after.slice(0, nextMarkerIdx + 1).trim();
    };

    const txPart = findSection('TRANSACTIONS');
    const catPart = findSection('CATEGORIES');
    const budgetPart = findSection('BUDGETS');

    if (!txPart && !catPart && !budgetPart) {
        return { ok: false, errors: ['No sections found. Expected [TRANSACTIONS], [CATEGORIES], or [BUDGETS].'], warnings };
    }

    let transactions = undefined;
    let inferredCategories = [];

    if (txPart) {
        const txRes = validateTransactionsCsv(txPart);
        if (!txRes.ok) errors.push(...txRes.errors);
        warnings.push(...(txRes.warnings || []));
        transactions = txRes.transactions || [];
        inferredCategories = txRes.inferredCategories || [];
    }

    /** @type {string[]|undefined} */
    let userCategories = undefined;
    if (catPart) {
        const rows = parseCsv(catPart);
        if (rows.length > 0) {
            const header = (rows[0] || []).map((x) => String(x || '').trim().toLowerCase());
            const nameIdx = header.indexOf('name');
            if (nameIdx < 0) {
                warnings.push('CATEGORIES section: missing "name" header; ignoring categories.');
            } else {
                const seen = new Set();
                const out = [];
                for (let i = 1; i < rows.length; i++) {
                    const name = String(rows[i]?.[nameIdx] ?? '')
                        .trim()
                        .replace(/\s+/g, ' ');
                    if (!name) continue;
                    const k = name.toLowerCase();
                    if (seen.has(k)) continue;
                    seen.add(k);
                    out.push(name);
                }
                out.sort((a, b) => a.localeCompare(b));
                userCategories = out;
            }
        }
    }

    /** @type {any[]|undefined} */
    let budgets = undefined;
    if (budgetPart) {
        const rows = parseCsv(budgetPart);
        if (rows.length > 0) {
            const header = (rows[0] || []).map((x) => String(x || '').trim().toLowerCase());
            const idx = (k) => header.indexOf(k);

            const required = ['id', 'scope', 'category', 'limitcents', 'warnpct', 'enabled'];
            const missing = required.filter((k) => idx(k) < 0);
            if (missing.length) {
                warnings.push(`BUDGETS section: missing columns (${missing.join(', ')}); ignoring budgets.`);
            } else {
                const out = [];
                for (let i = 1; i < rows.length; i++) {
                    const r = rows[i];
                    if (!r || r.every((x) => String(x || '').trim() === '')) continue;

                    const scope = String(r[idx('scope')] || '').trim();
                    const normalizedScope = scope === 'category' ? 'category' : 'overall';
                    const category = String(r[idx('category')] || '').trim();
                    if (normalizedScope === 'category' && !category) {
                        warnings.push(`BUDGETS row ${i}: category budget missing category; skipped.`);
                        continue;
                    }

                    const limitCents = Math.max(0, Math.trunc(Number(String(r[idx('limitcents')] || '').trim())));
                    if (!Number.isFinite(limitCents) || limitCents <= 0) {
                        warnings.push(`BUDGETS row ${i}: invalid limitCents; skipped.`);
                        continue;
                    }

                    const warnPct = Math.round(Number(String(r[idx('warnpct')] || '').trim() || '80'));
                    const enabledRaw = String(r[idx('enabled')] || '').trim().toLowerCase();
                    const enabled = enabledRaw === 'true' || enabledRaw === '1' || enabledRaw === 'yes';

                    out.push({
                        id: String(r[idx('id')] || '').trim() || undefined,
                        scope: normalizedScope,
                        category: normalizedScope === 'category' ? category : undefined,
                        limitCents,
                        warnPct: Number.isFinite(warnPct) ? warnPct : 80,
                        enabled,
                        createdAtMs: Number(String(r[idx('createdatms')] || '').trim()) || Date.now(),
                        updatedAtMs: Number(String(r[idx('updatedatms')] || '').trim()) || Date.now(),
                    });
                }
                budgets = out;
            }
        }
    }

    // Helpful warning if user categories missing but transactions imply categories.
    if (!userCategories && inferredCategories.length) {
        warnings.push(
            `Transactions include categories (${inferredCategories.slice(0, 6).join(', ')}${inferredCategories.length > 6 ? ', …' : ''}). You may want to import categories too so they appear in the category manager.`
        );
    }

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        transactions,
        userCategories,
        budgets,
    };
}

/**
 * Apply imported transactions (merge or replace) into localStorage by calling the same storage helpers as the app.
 *
 * Merge strategy:
 * - If imported tx has id and matches an existing id, overwrite the existing record with imported fields.
 * - Else, append as a new transaction and ensure it has an id.
 *
 * Replace strategy:
 * - Replace all existing transactions with imported set (ensure ids exist).
 *
 * PUBLIC_INTERFACE
 * @param {any[]} importedTxs
 * @param {{mode:'merge'|'replace'}} options
 * @returns {{ok:boolean, appliedCount:number}}
 */
export function applyImportedTransactions(importedTxs, { mode }) {
    /** This is a public function. */
    const incoming = Array.isArray(importedTxs) ? importedTxs : [];
    const existing = loadLegacyTransactions();

    const ensureId = (tx) => ({
        id: tx?.id || `tx_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
        ...tx,
    });

    if (mode === 'replace') {
        const next = incoming.map(ensureId);
        saveLegacyTransactions(next);
        return { ok: true, appliedCount: next.length };
    }

    // merge
    const byId = new Map();
    for (const tx of existing || []) {
        if (tx?.id) byId.set(String(tx.id), { ...tx });
    }

    const appended = [];
    for (const imp of incoming) {
        if (imp?.id && byId.has(String(imp.id))) {
            const id = String(imp.id);
            byId.set(id, { ...byId.get(id), ...imp, id });
        } else {
            appended.push(ensureId(imp));
        }
    }

    const next = [...byId.values(), ...appended];
    saveLegacyTransactions(next);
    return { ok: true, appliedCount: incoming.length };
}

/**
 * Apply imported categories to localStorage.
 *
 * Replace strategy applies ONLY to *user categories* (fixed categories always remain).
 *
 * PUBLIC_INTERFACE
 * @param {string[]} importedUserCategories
 * @param {{mode:'merge'|'replace'}} options
 * @returns {{ok:boolean, appliedCount:number}}
 */
export function applyImportedUserCategories(importedUserCategories, { mode }) {
    /** This is a public function. */
    const incoming = (Array.isArray(importedUserCategories) ? importedUserCategories : [])
        .map((c) => String(c || '').trim().replace(/\s+/g, ' '))
        .filter(Boolean);

    const fixed = new Set(getFixedCategories().map((c) => c.toLowerCase()));

    const cleanedIncoming = incoming.filter((c) => !fixed.has(c.toLowerCase()));

    if (mode === 'replace') {
        saveUserCategories(cleanedIncoming);
        return { ok: true, appliedCount: cleanedIncoming.length };
    }

    const existing = loadUserCategories();
    const seen = new Set(existing.map((c) => c.toLowerCase()));
    const next = [...existing];

    for (const c of cleanedIncoming) {
        const k = c.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(c);
    }

    saveUserCategories(next);
    return { ok: true, appliedCount: cleanedIncoming.length };
}

/**
 * Apply imported budgets.
 * NOTE: budgetsStorage only exposes load + upsert + delete; for replace we directly write the same key format is NOT exposed.
 * Since the request is "keep localStorage-only", we implement replace by removing and upserting through public API is not possible without delete-all.
 * Here we implement merge-only for budgets in this step to avoid reaching into private storage keys.
 *
 * PUBLIC_INTERFACE
 * @returns {{ok:boolean, error?:string}}
 */
export function budgetsImportNotSupported() {
    /** This is a public function. */
    return {
        ok: false,
        error: 'Budgets import is not supported in this version (transactions + categories are supported).',
    };
}
