import { useEffect, type PropsWithChildren } from "react";
import { ensureAppSeeds } from "@/db/init";

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    ensureAppSeeds().catch((error) => {
      console.error("Failed to ensure app seeds", error);
    });
  }, []);

  return <>{children}</>;
}
