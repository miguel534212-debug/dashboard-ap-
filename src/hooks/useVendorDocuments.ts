import { useState, useCallback, useEffect } from 'react';
import type { VendorDocument } from '../types/invoice';
import { generateId } from '../utils/calculations';

const STORAGE_KEY = 'boc-ap-vendor-docs';

function loadDocuments(): VendorDocument[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function useVendorDocuments() {
  const [documents, setDocuments] = useState<VendorDocument[]>(loadDocuments);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const addDocument = useCallback((doc: Omit<VendorDocument, 'id' | 'uploadDate'>) => {
    setDocuments(prev => [...prev, {
      ...doc,
      id: generateId(),
      uploadDate: new Date().toISOString().slice(0, 10),
    }]);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  const groupedByVendor = useCallback(() => {
    const grouped = new Map<string, VendorDocument[]>();
    for (const doc of documents) {
      const list = grouped.get(doc.vendor) || [];
      list.push(doc);
      grouped.set(doc.vendor, list);
    }
    return Array.from(grouped.entries())
      .map(([vendor, docs]) => ({ vendor, docs }))
      .sort((a, b) => a.vendor.localeCompare(b.vendor));
  }, [documents]);

  return {
    documents,
    addDocument,
    deleteDocument,
    groupedByVendor: groupedByVendor(),
  };
}
