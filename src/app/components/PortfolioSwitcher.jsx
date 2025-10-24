// src/app/components/PortfolioSwitcher.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listenPortfolios,
  createPortfolio,
  renamePortfolio,
  deletePortfolio as deletePortfolioDoc,
} from "../../lib/portfolios";
import {
  clearDefaultPortfolio,
  deletePortfolioDeep,
} from "../../lib/portfolioStore";
import NewPortfolioDialog from "./NewPortfolioDialog";

const LS_LAST = "finasfera:lastPortfolioId";
const ALL_ID = "__ALL__";

export default function PortfolioSwitcher({ uid, value, onChange }) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [showCreate, setShowCreate] = useState(false);

  // pobranie listy portfeli
  useEffect(() => {
    if (!uid) return;
    const unsub = listenPortfolios(uid, (list) => {
      const safe = Array.isArray(list) ? list.filter(Boolean) : [];
      setItems(safe);
      itemsRef.current = safe;

      const curId = normalized(value);
      const exists = curId === ALL_ID ? true : safe.some((p) => String(p.id) === curId);

      // jeśli bieżący nie istnieje → przełącz na "Wszystkie portfele"
      if (!exists) onChange?.(ALL_ID);

      // jeśli nic nie ustawione → domyślnie "Wszystkie portfele"
      if (!curId) onChange?.(ALL_ID);
    });
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // zamykanie menu po kliknięciu poza
  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // zapamiętywanie wyboru
  useEffect(() => {
    const curId = normalized(value);
    if (curId) localStorage.setItem(LS_LAST, String(curId));
    else localStorage.setItem(LS_LAST, ALL_ID);
  }, [value]);

  // przy starcie: odtwórz ostatni wybór (zawsze preferujemy ALL jeśli brak)
  useEffect(() => {
    const curId = normalized(value);
    if (curId) return;
    const prev = localStorage.getItem(LS_LAST);
    onChange?.(prev || ALL_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const curId = useMemo(() => normalized(value) || ALL_ID, [value]);

  const current = useMemo(() => {
    if (curId === ALL_ID) return { id: ALL_ID, name: "Wszystkie portfele" };
    return items.find((x) => x.id === curId) || { id: curId, name: "Portfel" };
  }, [items, curId]);

  const canDeleteCurrent = curId !== ALL_ID; // ALL nie kasujemy

  async function handleCreateFromDialog(payload) {
    const id = await createPortfolio(uid, payload); // {name, accountType, baseCurrency, broker}
    onChange?.(id);
    setMenuOpen(false);
  }

  async function handleRename() {
    if (curId === ALL_ID) {
      alert("„Wszystkie portfele” to widok zbiorczy — nie można zmienić nazwy.");
      return;
    }
    const baseName = current?.name || "Portfel";
    const name = prompt("Nowa nazwa:", baseName);
    if (name == null) return;
    await renamePortfolio(uid, curId, name);
    setMenuOpen(false);
  }

  async function handleDelete() {
    if (!canDeleteCurrent) return;

    try {
      // ALL nie usuwamy (to widok)
      if (curId === ALL_ID) {
        alert("Widok „Wszystkie portfele” nie jest portfelem do kasowania.");
        return;
      }

      const label = current?.name || "Portfel";
      const ok = confirm(`Usunąć portfel „${label}”? Operacja jest nieodwracalna.`);
      if (!ok) return;

      await deletePortfolioDeep(uid, curId); // subkolekcje + dokument
      try { await deletePortfolioDoc(uid, curId); } catch {}

      onChange?.(ALL_ID);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Operacja nie powiodła się.");
    } finally {
      setMenuOpen(false);
    }
  }

  const deleteLabel = "Usuń portfel…";
  const deleteTitle = "Usuń bieżący portfel (wraz z danymi)";

  return (
    <div className="relative" ref={menuRef}>
      {/* przycisk z nazwą aktualnego */}
      <button
        type="button"
        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
        onClick={() => setMenuOpen((s) => !s)}
        title="Wybierz / zarządzaj portfelami"
        aria-expanded={menuOpen}
      >
        {current?.name || "Wszystkie portfele"} <span aria-hidden>▾</span>
      </button>

      {menuOpen && (
        <div className="absolute z-20 mt-2 w-60 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          <div className="p-1">
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800"
              onClick={() => { setShowCreate(true); }}
            >
              Nowy portfel
            </button>
            <button
              className={[ "w-full text-left px-3 py-2 rounded-lg",
                curId === ALL_ID ? "opacity-40 cursor-not-allowed" : "hover:bg-zinc-800"
              ].join(" ")}
              onClick={handleRename}
              disabled={curId === ALL_ID}
            >
              Zmień nazwę…
            </button>
            <button
              className={[
                "w-full text-left px-3 py-2 rounded-lg",
                canDeleteCurrent ? "hover:bg-zinc-800 text-red-300" : "opacity-40 cursor-not-allowed",
              ].join(" ")}
              onClick={handleDelete}
              disabled={!canDeleteCurrent}
              title={deleteTitle}
            >
              {deleteLabel}
            </button>
          </div>

          <div className="border-t border-zinc-800 my-1" />

          <div className="p-1">
            <div className="px-3 py-1 text-xs text-zinc-400">Przełącz</div>

            {/* „Wszystkie portfele” */}
            <button
              className={[
                "w-full text-left px-3 py-2 rounded-lg",
                curId === ALL_ID ? "bg-zinc-800" : "hover:bg-zinc-800",
              ].join(" ")}
              onClick={() => {
                onChange?.(ALL_ID);
                setMenuOpen(false);
              }}
            >
              Wszystkie portfele
            </button>

            {/* Pozostałe (użytkownika) */}
            {items.map((p) => (
              <button
                key={p.id}
                className={[
                  "w-full text-left px-3 py-2 rounded-lg",
                  curId === p.id ? "bg-zinc-800" : "hover:bg-zinc-800",
                ].join(" ")}
                onClick={() => {
                  onChange?.(p.id);
                  setMenuOpen(false);
                }}
              >
                {p.name || "Portfel"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dialog tworzenia portfela */}
      <NewPortfolioDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateFromDialog}
      />
    </div>
  );
}

function normalized(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  if (s.toLowerCase() === "all" || s === "__ALL__") return "__ALL__";
  return String(v);
}
