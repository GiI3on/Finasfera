// src/lib/accounts.js
export const ACCOUNT_TYPES = {
  TAXABLE_PL: { key: "TAXABLE_PL", label: "Zwykłe (PL)", taxExempt: false },
  IKE_PL:     { key: "IKE_PL",     label: "IKE",         taxExempt: true  },
  IKZE_PL:    { key: "IKZE_PL",    label: "IKZE",        taxExempt: true  },
};

export function normalizeAccountType(t) {
  const k = String(t || "TAXABLE_PL").toUpperCase();
  return ACCOUNT_TYPES[k] ? k : "TAXABLE_PL";
}

export function accountLabel(t) {
  const k = normalizeAccountType(t);
  return ACCOUNT_TYPES[k].label;
}

export function isTaxExemptAccount(t) {
  const k = normalizeAccountType(t);
  return !!ACCOUNT_TYPES[k].taxExempt;
}
