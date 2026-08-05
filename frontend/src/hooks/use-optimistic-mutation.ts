

// FleetDocs — Optimistic UI mutation hook
// P3-3: For all mutations — immediately update UI, show loading, on error rollback + toast.

import * as React from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";

interface OptimisticMutationOptions<TData, TPatch> {
  // The current state (used for rollback)
  getCurrent: () => TData;
  // Apply the optimistic patch to the state
  applyOptimistic: (current: TData, patch: TPatch) => TData;
  // Mutate state on the client (e.g., set state via setter)
  setState: (next: TData) => void;
  // The async API call
  mutate: (patch: TPatch) => Promise<unknown>;
  // Success message
  successMessage?: string;
  // Rollback on error (default: revert to previous state)
  errorMessage?: string;
  // Show toast on success (default: false)
  showSuccessToast?: boolean;
}

export function useOptimisticMutation<TData, TPatch>(
  options: OptimisticMutationOptions<TData, TPatch>
) {
  const [isPending, setIsPending] = React.useState(false);
  const previousRef = React.useRef<TData | null>(null);

  const mutate = React.useCallback(
    async (patch: TPatch) => {
      const previous = options.getCurrent();
      previousRef.current = previous;
      // Optimistically apply
      const optimistic = options.applyOptimistic(previous, patch);
      options.setState(optimistic);
      setIsPending(true);

      try {
        await options.mutate(patch);
        if (options.showSuccessToast && options.successMessage) {
          toast.success(options.successMessage);
        }
        return { success: true as const };
      } catch (err) {
        // Rollback
        options.setState(previousRef.current ?? previous);
        toast.error(
          options.errorMessage ??
            (getErrorMessage(err))
        );
        return { success: false as const, error: err };
      } finally {
        setIsPending(false);
        previousRef.current = null;
      }
    },
    [options]
  );

  return { mutate, isPending };
}
