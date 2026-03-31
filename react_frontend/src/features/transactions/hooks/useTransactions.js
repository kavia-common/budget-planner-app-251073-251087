import { useEffect, useState } from 'react';
import { loadLegacyTransactions, saveLegacyTransactions } from '../../../services/storage/localStorage';

/**
 * Manages the current app's legacy transactions array and persists it to localStorage.
 *
 * PUBLIC_INTERFACE
 * @returns {{
 *  transactions: Array,
 *  addTransaction: (tx: any) => void,
 *  setTransactions: (txs: Array) => void,
 * }}
 */
export function useTransactions() {
  /** This is a public function. */
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    setTransactions(loadLegacyTransactions());
  }, []);

  useEffect(() => {
    saveLegacyTransactions(transactions);
  }, [transactions]);

  const addTransaction = (tx) => {
    setTransactions((prev) => [...prev, { ...tx }]);
  };

  return { transactions, addTransaction, setTransactions };
}

