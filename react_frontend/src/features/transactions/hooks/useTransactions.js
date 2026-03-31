import { useEffect, useState } from 'react';
import { loadLegacyTransactions, saveLegacyTransactions } from '../../../services/storage/localStorage';

/**
 * @file useTransactions.js
 * Legacy transaction store (array) + localStorage persistence.
 */

/**
 * Manages the current app's legacy transactions array and persists it to localStorage.
 *
 * PUBLIC_INTERFACE
 * @returns {{
 *  transactions: Array,
 *  addTransaction: (tx: any) => void,
 *  updateTransaction: (id: string, patch: any) => void,
 *  deleteTransaction: (id: string) => void,
 *  setTransactions: (txs: Array) => void,
 * }}
 */
export function useTransactions() {
    /** This is a public function. */
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        const loaded = loadLegacyTransactions();

        // Ensure every legacy item has an id so edit/delete is stable.
        const withIds = (loaded || []).map((tx) => ({
            id: tx.id || `tx_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
            ...tx,
        }));

        setTransactions(withIds);
    }, []);

    useEffect(() => {
        saveLegacyTransactions(transactions);
    }, [transactions]);

    /**
     * Add a new transaction (generates an id if missing).
     * @param {any} tx
     */
    function addTransaction(tx) {
        setTransactions((prev) => [
            ...prev,
            {
                id: tx.id || `tx_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
                ...tx,
            },
        ]);
    }

    /**
     * Update an existing transaction.
     * @param {string} id
     * @param {any} patch
     */
    function updateTransaction(id, patch) {
        setTransactions((prev) =>
            (prev || []).map((tx) => {
                if (tx.id !== id) return tx;
                return { ...tx, ...patch, id };
            })
        );
    }

    /**
     * Delete an existing transaction.
     * @param {string} id
     */
    function deleteTransaction(id) {
        setTransactions((prev) => (prev || []).filter((tx) => tx.id !== id));
    }

    return { transactions, addTransaction, updateTransaction, deleteTransaction, setTransactions };
}
