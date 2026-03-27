import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { useState, useRef, useEffect } from "react";
import iconBanknotes from "../icons/banknotes-dollar-money-currency-finance-payment-svgrepo-com.svg";
import iconChartPie from "../icons/chart-pie-svgrepo-com.svg";
import iconLawBuilding from "../icons/law-building-svgrepo-com.svg";


export default function Header({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navLinks = [
    { label: "Home", path: "/dashboard", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>
    )},
    { label: "Transações", path: "/transactions", icon: (
      <img src={iconBanknotes} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
    )},
    { label: "Investimentos", path: "/investiments", icon: (
      <img src={iconChartPie} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
    )},
    { label: "Open Finance", path: "/open-finance", icon: (
      <img src={iconLawBuilding} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
    )},
  ];

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function isActive(path) {
    return location.pathname === path;
  }

  return (
    <header className="bg-blue-600 px-4 lg:px-8 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
        {/* LOGO */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => navigate("/dashboard")}
        >
          <Logo size={40} variant="white" />
        </div>

        {/* NAV desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive(link.path)
                  ? "bg-white/20 text-white font-medium"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.icon}
              {link.label}
            </button>
          ))}
        </nav>

        {/* RIGHT: mobile toggle + profile */}
        <div className="flex items-center gap-2">
          {/* Mobile toggle */}
          <button
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Abrir menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>

          {/* Profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
              title="Perfil"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden animate-scale-in">
                <button
                  onClick={() => { navigate("/profile"); setIsOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Meu perfil
                </button>
                <div className="h-px bg-slate-100" />
                <button
                  onClick={() => { navigate("/settings"); setIsOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Configurações
                </button>
                <div className="h-px bg-slate-100" />
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="md:hidden border-t border-blue-500 pb-3 animate-slide-down">
          <nav className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => { navigate(link.path); setMobileOpen(false); }}
                className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(link.path)
                    ? "bg-white/20 text-white font-medium"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
