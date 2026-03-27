import { Outlet, useNavigate } from "react-router-dom";
import Header from "./Header";
import AssistantWidget from "./AssistantWidget";
import { supabase } from "../supabaseClient";

export default function Layout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <AssistantWidget />
    </div>
  );
}
