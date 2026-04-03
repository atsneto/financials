// Bank definitions — id, label, brand color, logo path
// Logos served from /banks/ (public folder)

const BANKS = [
  { id: "nubank",         label: "Nubank",              color: "#820AD1", logo: "/banks/nubank.svg" },
  { id: "itau",           label: "Itaú",                color: "#003399", logo: "/banks/itau.svg" },
  { id: "bradesco",       label: "Bradesco",            color: "#CC092F", logo: "/banks/bradesco.svg" },
  { id: "santander",      label: "Santander",           color: "#EC0000", logo: "/banks/santander.svg" },
  { id: "banco-do-brasil",label: "Banco do Brasil",     color: "#FFEF00", logo: "/banks/banco-do-brasil.svg" },
  { id: "caixa",          label: "Caixa Econômica",     color: "#005CA9", logo: "/banks/caixa.svg" },
  { id: "inter",          label: "Inter",               color: "#FF7A00", logo: "/banks/inter.svg" },
  { id: "c6",             label: "C6 Bank",             color: "#242424", logo: "/banks/c6.svg" },
  { id: "neon",           label: "Neon",                color: "#0DC5DC", logo: "/banks/neon.svg" },
  { id: "picpay",         label: "PicPay",              color: "#21C25E", logo: "/banks/picpay.svg" },
  { id: "mercado-pago",   label: "Mercado Pago",        color: "#009EE3", logo: "/banks/mercado-pago.svg" },
  { id: "pagbank",        label: "PagBank",             color: "#00A859", logo: "/banks/pagbank.svg" },
  { id: "stone",          label: "Stone",               color: "#00A868", logo: "/banks/stone.svg" },
  { id: "xp",             label: "XP Investimentos",    color: "#000000", logo: "/banks/xp.svg" },
  { id: "btg",            label: "BTG Pactual",         color: "#001E62", logo: "/banks/btg.svg" },
  { id: "safra",          label: "Safra",               color: "#003882", logo: "/banks/safra.svg" },
  { id: "sicoob",         label: "Sicoob",              color: "#003641", logo: "/banks/sicoob.svg" },
  { id: "sicredi",        label: "Sicredi",             color: "#33A02C", logo: "/banks/sicredi.svg" },
  { id: "original",       label: "Original",            color: "#00A651", logo: "/banks/original.svg" },
  { id: "bmg",            label: "BMG",                 color: "#FF6600", logo: "/banks/bmg.svg" },
  { id: "brb",            label: "BRB",                 color: "#004B87", logo: "/banks/brb.svg" },
  { id: "banrisul",       label: "Banrisul",            color: "#004A93", logo: "/banks/banrisul.svg" },
  { id: "bv",             label: "BV",                  color: "#0066FF", logo: "/banks/bv.svg" },
];

export default BANKS;

/** Lookup a bank by id — returns { id, label, color, logo } or null */
export function getBank(bankId) {
  return BANKS.find((b) => b.id === bankId) || null;
}
