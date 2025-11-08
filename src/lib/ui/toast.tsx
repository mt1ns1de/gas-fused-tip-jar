'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastAction = { label: string; href: string };
type ToastVariant = 'success' | 'info' | 'error';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  actions?: ToastAction[];
  variant?: ToastVariant;
  // internal:
  _ttl?: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => string;
  remove: (id: string) => void;
  success: (title: string, opts?: Omit<ToastItem, 'id' | 'title' | 'variant'>) => string;
  info: (title: string, opts?: Omit<ToastItem, 'id' | 'title' | 'variant'>) => string;
  error: (title: string, opts?: Omit<ToastItem, 'id' | 'title' | 'variant'>) => string;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, any>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current[id];
    if (tm) {
      clearTimeout(tm);
      delete timers.current[id];
    }
  }, []);

  const scheduleAutoHide = useCallback((id: string, ttl = 3600) => {
    const tm = setTimeout(() => remove(id), ttl);
    timers.current[id] = tm;
  }, [remove]);

  const push = useCallback<ToastContextValue['push']>((t) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: ToastItem = { id, ...t };
    setToasts((prev) => [...prev.slice(-4), item]); // держим до 5 шт максимум
    // по умолчанию автоскрытие ~3.6с, если не отключили явно
    const ttl = typeof t._ttl === 'number' && t._ttl > 0 ? t._ttl : 3600;
    if (ttl > 0) scheduleAutoHide(id, ttl);
    return id;
  }, [scheduleAutoHide]);

  const success = useCallback<ToastContextValue['success']>((title, opts) => {
    return push({ title, variant: 'success', ...opts });
  }, [push]);

  const info = useCallback<ToastContextValue['info']>((title, opts) => {
    return push({ title, variant: 'info', ...opts });
  }, [push]);

  const error = useCallback<ToastContextValue['error']>((title, opts) => {
    return push({ title, variant: 'error', ...opts });
  }, [push]);

  const value = useMemo<ToastContextValue>(() => ({
    toasts, push, remove, success, info, error,
  }), [toasts, push, remove, success, info, error]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
