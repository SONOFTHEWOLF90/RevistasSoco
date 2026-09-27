"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { magazineCoverUrl, magazines } from "@/lib/catalog";

export default function MagazineSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return [];
    }

    return magazines.filter((magazine) => {
      return [
        magazine.editorial,
        magazine.collection,
        magazine.issue,
        magazine.name,
      ].some((value) => value.toLowerCase().includes(search));
    });
  }, [query]);

  return (
    <div className="relative w-full max-w-xl">
      {/* BUSCADOR */}
      <div className="flex items-center gap-3 rounded-full border border-[#dedede] bg-[#fafafa] px-5 py-2.5 transition focus-within:border-[#bdbdbd] focus-within:bg-white">
        <span className="text-base text-[#777777]">⌕</span>

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar revistas..."
          className="w-full bg-transparent text-sm text-[#333333] outline-none placeholder:text-[#999999]"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-sm text-[#999999] transition hover:text-[#333333]"
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      {/* RESULTADOS */}
      {query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-lg">
          {results.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto p-2">
              {results.map((magazine) => (
                <Link
                  key={magazine.id}
                  href={`/revista/${magazine.id}`}
                  onClick={() => setQuery("")}
                  className="flex gap-3 rounded-xl p-2 transition hover:bg-[#f7f7f7]"
                >
                  <img
                    src={magazineCoverUrl(magazine)}
                    alt=""
                    className="h-16 w-12 shrink-0 rounded-sm border border-[#e5e5e5] object-cover"
                  />

                  <div className="min-w-0 self-center">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[#999999]">
                      {magazine.editorial}
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-[#333333]">
                      {magazine.collection} — Nº {magazine.issue}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-[#777777]">
                      {magazine.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-[#777777]">No encontramos revistas.</p>

              <p className="mt-1 text-xs text-[#aaaaaa]">
                Prueba con otro término.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
