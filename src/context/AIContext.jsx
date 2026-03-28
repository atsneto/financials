import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";

const AIContext = createContext(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function AIProvider({ children }) {
  const [aiData, setAiData] = useState(null);
  const [status, setStatus] = useState("idle");
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setStatus("loading");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("idle"); fetchingRef.current = false; return; }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/financial-ai-insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) { setStatus("error"); fetchingRef.current = false; return; }

      const data = await res.json();
      setAiData(data);
      setStatus("done");
    } catch {
      setStatus("error");
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handler = () => { setAiData(null); setStatus("idle"); };
    window.addEventListener("transactions-updated", handler);
    return () => window.removeEventListener("transactions-updated", handler);
  }, []);

  return (
    <AIContext.Provider value={{ data: aiData, status, refresh }}>
      {children}
    </AIContext.Provider>
  );
}

export function useJames() {
  return useContext(AIContext);
}
