import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getAdminToken, verifySession } from "@/lib/auth";

export function ProtectedRoute() {
  const [state, setState] = useState<"loading" | "ok" | "fail">(() =>
    getAdminToken() ? "loading" : "fail",
  );

  useEffect(() => {
    if (!getAdminToken()) {
      setState("fail");
      return;
    }
    verifySession()
      .then(() => setState("ok"))
      .catch(() => setState("fail"));
  }, []);

  if (state === "loading") {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }
  if (state === "fail") return <Navigate to="/login" replace />;
  return <Outlet />;
}
