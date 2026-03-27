import logoColor from "../assets/logo.svg";

/**
 * Props:
 *   size    — altura em px (default 28)
 *   variant — "color" (default) | "white" (aplica filter para fundo escuro)
 *   className — classes extras no wrapper
 */
export default function Logo({ size = 28, variant = "color", className = "" }) {
  return (
    <img
      src={logoColor}
      alt="Financials"
      height={size}
      style={{
        height: size,
        width: "auto",
        filter: variant === "white" ? "brightness(0) invert(1)" : "none",
      }}
      className={`select-none ${className}`}
    />
  );
}
