import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchEmpresaDashboard } from '../services/apiService.ts';
import {
  EmpresaDashboardModule,
  EmpresaDashboardRequestOptions,
  EmpresaDashboardResponse,
} from '../types.ts';

const ALL_MODULES: readonly EmpresaDashboardModule[] = [
  'metrics',
  'pipeline',
  'tasks',
  'genealogy',
  'geo',
  'legal',
] as const;

const normalizeModules = (
  input?: EmpresaDashboardModule[],
): EmpresaDashboardModule[] => {
  const source = input && input.length > 0 ? input : ALL_MODULES;
  const unique: EmpresaDashboardModule[] = [];

  source.forEach((module) => {
    if (ALL_MODULES.includes(module) && !unique.includes(module)) {
      unique.push(module);
    }
  });

  return unique;
};

const areSameModules = (
  current: EmpresaDashboardModule[],
  next: EmpresaDashboardModule[],
) => current.length === next.length && current.every((module, index) => module === next[index]);

export interface UseEmpresaDashboardOptions {
  include?: EmpresaDashboardModule[];
  refresh?: boolean;
  pollIntervalMs?: number | null;
  autoFetch?: boolean;
}

export interface UseEmpresaDashboardResult {
  data: EmpresaDashboardResponse | null;
  loading: boolean;
  error: string | null;
  modules: EmpresaDashboardModule[];
  sanitizedCnpj: string | null;
  isReady: boolean;
  refetch: (override?: EmpresaDashboardRequestOptions) => Promise<void>;
  setModules: (next: EmpresaDashboardModule[]) => void;
}

export function useEmpresaDashboard(
  cnpj: string | null | undefined,
  options: UseEmpresaDashboardOptions = {},
): UseEmpresaDashboardResult {
  const normalizedInitialModules = useMemo(
    () => normalizeModules(options.include),
    [options.include],
  );

  const [modules, setModulesState] = useState<EmpresaDashboardModule[]>(
    normalizedInitialModules,
  );
  const [data, setData] = useState<EmpresaDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setModulesState((prev) =>
      areSameModules(prev, normalizedInitialModules) ? prev : normalizedInitialModules,
    );
  }, [normalizedInitialModules]);

  const sanitizedCnpj = useMemo(() => {
    if (!cnpj) {
      return null;
    }
    const cleaned = cnpj.replace(/[^\d]/g, '');
    return cleaned.length > 0 ? cleaned : null;
  }, [cnpj]);

  const isReady = Boolean(sanitizedCnpj && sanitizedCnpj.length === 14);
  const pollIntervalMs = options.pollIntervalMs ?? null;
  const autoFetch = options.autoFetch !== false;

  useEffect(() => {
    if (!cnpj) {
      setData(null);
      setError(null);
      return;
    }

    if (!sanitizedCnpj || sanitizedCnpj.length !== 14) {
  setData(null);
  setError('CNPJ deve ter 14 digitos.');
      controllerRef.current?.abort();
      setLoading(false);
    } else {
  setError((current) => (current === 'CNPJ deve ter 14 digitos.' ? null : current));
    }
  }, [cnpj, sanitizedCnpj]);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      clearPolling();
    },
    [clearPolling],
  );

  const refetch = useCallback(
    async (override: EmpresaDashboardRequestOptions = {}) => {
      if (!sanitizedCnpj || sanitizedCnpj.length !== 14) {
        if (sanitizedCnpj && sanitizedCnpj.length > 0) {
          setError('CNPJ invalido para dashboard.');
        }
        setData(null);
        setLoading(false);
        return;
      }

      const include = normalizeModules(override.include ?? modules);
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);

      try {
        const payload = await fetchEmpresaDashboard(sanitizedCnpj, {
          include,
          refresh: override.refresh ?? options.refresh ?? false,
          signal: controller.signal,
        });

        if (requestIdRef.current === requestId) {
          setData(payload);
          setError(null);
        }
      } catch (err: unknown) {
        if (requestIdRef.current === requestId && !controller.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Falha ao carregar dashboard.';
          setError(message);
          setData(null);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
        }
      }
    },
    [modules, options.refresh, sanitizedCnpj],
  );

  useEffect(() => {
    if (!autoFetch || !isReady) {
      return;
    }
    refetch();
  }, [autoFetch, isReady, refetch]);

  useEffect(() => {
    clearPolling();

    if (!autoFetch || !isReady) {
      return;
    }

    if (!pollIntervalMs || pollIntervalMs <= 0) {
      return;
    }

    pollRef.current = setInterval(() => {
      refetch();
    }, pollIntervalMs);

    return clearPolling;
  }, [autoFetch, isReady, pollIntervalMs, refetch, clearPolling]);

  const setModules = useCallback((next: EmpresaDashboardModule[]) => {
    const normalized = normalizeModules(next);
    setModulesState((prev) => (areSameModules(prev, normalized) ? prev : normalized));
  }, []);

  return {
    data,
    loading,
    error,
    modules,
    sanitizedCnpj: sanitizedCnpj && sanitizedCnpj.length === 14 ? sanitizedCnpj : null,
    isReady,
    refetch,
    setModules,
  };
}
