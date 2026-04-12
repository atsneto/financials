import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import iconDollar from "../svg/dollar.svg";
import iconChart from "../svg/chart.svg";
import iconGlobe from "../svg/globe.svg";
import iconCreditCard from "../svg/credit-card.svg";
import iconSun from "../svg/sun.svg";
import iconMoon from "../svg/moon.svg";
import iconHome from "../svg/home.svg";
import iconInsights from "../svg/insights.svg";
import iconComment from "../svg/comment.svg";
import iconMenu from "../svg/menu.svg";
import iconClose from "../svg/close.svg";
import iconUser from "../svg/user.svg";


export default function Header({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navLinks = [
    { label: "Home", path: "/dashboard", icon: (
      <img src={iconHome} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
    )},
    { label: "Transações", path: "/transactions", icon: (
      <img src={iconDollar} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
    )},
    { label: "Investimentos", path: "/investiments", icon: (
      <img src={iconChart} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
    )},
    { label: "Open Finance", path: "/open-finance", icon: (
      <img src={iconGlobe} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
    )},
    { label: "Metas", path: "/goals", icon: (
      <img src={iconCreditCard} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
    )},
    { label: "James", path: "/james", icon: (
      <img src={iconComment} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
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
    <header className="bg-blue-600 dark:bg-[#0d1320] dark:border-b dark:border-slate-800 px-4 lg:px-8 sticky top-0 z-40">
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
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            <img
              src={theme === "dark" ? iconSun : iconMoon}
              alt=""
              className="w-5 h-5"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </button>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Abrir menu"
          >
            <img src={mobileOpen ? iconClose : iconMenu} alt="" className="w-5 h-5" style={{ filter: "brightness(0) invert(1)" }} />
          </button>

          {/* Profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
              title="Perfil"
            >
              <img src={iconUser} alt="" className="w-[18px] h-[18px]" style={{ filter: "brightness(0) invert(1)" }} />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-scale-in">
                <button
                  onClick={() => { navigate("/profile"); setIsOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Meu perfil
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700" />
                <button
                  onClick={() => { navigate("/settings"); setIsOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Configurações
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700" />
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
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
