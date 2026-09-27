"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { magazineCoverUrl, magazines, type Magazine } from "@/lib/catalog";

const STORAGE_KEY = "hemeroteca-reading-history";

type ReadingItem = {
  id: string;
  page: number;
  updatedAt: number;
};

type ContinueItem = {
  magazine: Magazine;
  page: number;
  updatedAt: number;
};

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot(): string {
  return "";
}

function subscribe(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

function resolveHistory(value: string): ContinueItem[] {
  if (!value) {
    return [];
  }

  try {
    const history: ReadingItem[] = JSON.parse(value);

    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .map((item) => {
        const magazine = magazines.find(
          (candidate) => candidate.id === item.id,
        );

        if (!magazine) {
          return null;
        }

        return {
          magazine,
          page: item.page,
          updatedAt: item.updatedAt,
        };
      })
      .filter((item): item is ContinueItem => item !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export default function ContinueReading() {
  const storedHistory = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const items = resolveHistory(storedHistory);

  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-5 flex items-end justify-between border-b border-[#e5e5e5] pb-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.28em] text-[#999999]">
            Tu biblioteca
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Continuar leyendo
          </h2>
        </div>

        <span className="text-xs text-[#999999]">
          {items.length} revista{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-6">
        {items.map(({ magazine, page }) => {
          const totalPages = magazine.paginas ?? 0;
          const progress =
            totalPages > 0
              ? Math.min(100, Math.round((page / totalPages) * 100))
              : 0;

          return (
            <Link
              key={magazine.id}
              href={`/revista/${magazine.id}?page=${page}`}
              className="group"
            >
              <div className="overflow-hidden rounded-sm border border-[#e5e5e5] bg-[#f5f5f5]">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={magazineCoverUrl(magazine)}
                    alt={magazine.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              </div>

              <div className="mt-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug">
                  {magazine.name}
                </p>

                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#999999]">
                  {magazine.editorial}
                </p>

                <div className="mt-3">
                  <div className="h-1 overflow-hidden rounded-full bg-[#eeeeee]">
                    <div
                      className="h-full bg-[#444444]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="mt-1.5 text-[10px] text-[#888888]">
                    Página {page}
                    {totalPages > 0 ? ` de ${totalPages}` : ""}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
