import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface LastUpdatedContextValue {
  lastUpdated: Date | null;
  markUpdated: () => void;
  formatted: string;
}

const LastUpdatedContext = createContext<LastUpdatedContextValue | null>(null);

export function LastUpdatedProvider({ children }: { children: ReactNode }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const markUpdated = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  const formatted = useMemo(() => {
    if (!lastUpdated) return "—";
    return lastUpdated.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, [lastUpdated]);

  const value = useMemo(
    () => ({ lastUpdated, markUpdated, formatted }),
    [lastUpdated, markUpdated, formatted]
  );

  return (
    <LastUpdatedContext.Provider value={value}>
      {children}
    </LastUpdatedContext.Provider>
  );
}

export function useLastUpdated() {
  const ctx = useContext(LastUpdatedContext);
  if (!ctx) throw new Error("useLastUpdated must be used within LastUpdatedProvider");
  return ctx;
}
