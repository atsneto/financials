import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

/**
 * Checks if the authenticated user has an active subscription.
 * - active  → renders children
 * - inactive/none → redirects to /subscribe
 * - loading → shows spinner
 */
export default function SubscriptionGate({ children }) {
  const [status, setStatus] = useState("loading"); // "loading" | "active" | "inactive"

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("inactive"); return; }

      const { data } = await supabase
        .from("subscriptions")
        .select("status, trial_ends_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const isPaid = data?.status === "active";
      const isTrialing =
        data?.status === "trialing" &&
        data?.trial_ends_at &&
        new Date(data.trial_ends_at) > new Date();

      setStatus(isPaid || isTrialing ? "active" : "inactive");
    }

    check();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500 border-slate-200 dark:border-slate-700" />
      </div>
    );
  }

  if (status === "inactive") {
    return <Navigate to="/subscribe" replace />;
  }

  return children;
}
