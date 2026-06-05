import type { ReactNode } from "react";
import { Alert } from "@mui/material";
import { LoadingSpinner } from "./LoadingSpinner";
import { PageLoadOverlay } from "./PageLoadOverlay";

interface QueryPageShellProps {
  isLoading: boolean;
  data: unknown;
  error: string | null;
  loadingLabel?: string;
  children: ReactNode;
}

/**
 * Renders children whenever data exists (including during background refetch).
 * Full-page spinner only when filters changed / first visit and no data yet.
 */
export function QueryPageShell({
  isLoading,
  data,
  error,
  loadingLabel,
  children,
}: QueryPageShellProps) {
  if (error && !data) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <>
      <PageLoadOverlay show={isLoading && !data} />
      {!data && isLoading ? (
        <LoadingSpinner label={loadingLabel} />
      ) : (
        children
      )}
    </>
  );
}
