"use client";

import Link from "next/link";
import { useState } from "react";

import { displayCollection, magazines, slugify } from "@/lib/catalog";

type GlobalIndexProps = {
  currentEditorial?: string;
  currentCollection?: string;
};

const editoriales = Array.from(
  new Set(magazines.map((magazine) => magazine.editorial)),
).sort((a, b) => a.localeCompare(b, "es"));

const indiceEditoriales = editoriales.map((editorial) => {
  const editorialMagazines = magazines.filter(
    (magazine) => magazine.editorial === editorial,
  );

  const collections = Array.from(
    new Set(
      editorialMagazines
        .map((magazine) => magazine.collection)
        .filter(Boolean),
    ),
  )
    .map((collection) => ({
      name: collection,
      count: editorialMagazines.filter(
        (magazine) => magazine.collection === collection,
      ).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return {
    editorial,
    count: editorialMagazines.length,
    collections,
  };
});

export default function GlobalIndex({
  currentEditorial,
  currentCollection,
}: GlobalIndexProps) {
  const [mobileMenu, setMobileMenu] = useState<
    "editoriales" | "colecciones" | null
  >(null);

  return (
    <>
      {/* =====================================================
          ÍNDICE MÓVIL
          ===================================================== */}

      <section className="border-b border-[#e5e5e5] bg-[#fafafa] md:hidden">
        <div className="grid grid-cols-2 divide-x divide-[#e5e5e5]">
          <button
            type="button"
            onClick={() =>
              setMobileMenu(
                mobileMenu === "editoriales" ? null : "editoriales",
              )
            }
            className="flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-xs font-medium text-[#555555]">
              Editoriales
            </span>

            <span
              className={`text-sm text-[#999999] transition-transform ${
                mobileMenu === "editoriales" ? "rotate-180" : ""
              }`}
            >
              ↓
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMobileMenu(
                mobileMenu === "colecciones" ? null : "colecciones",
              )
            }
            className="flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-xs font-medium text-[#555555]">
              Colecciones
            </span>

            <span
              className={`text-sm text-[#999999] transition-transform ${
                mobileMenu === "colecciones" ? "rotate-180" : ""
              }`}
            >
              ↓
            </span>
          </button>
        </div>

        {mobileMenu === "editoriales" && (
          <div className="border-t border-[#e5e5e5] bg-white px-4 py-3">
            {indiceEditoriales.map((item) => (
              <Link
                key={item.editorial}
                href={`/editorial/${slugify(item.editorial)}`}
                className={`flex w-full items-center justify-between border-b border-[#eeeeee] py-3 text-left last:border-b-0 ${
                  currentEditorial === item.editorial ? "text-[#222222]" : ""
                }`}
              >
                <span
                  className={`text-sm ${
                    currentEditorial === item.editorial
                      ? "font-medium text-[#222222]"
                      : "text-[#555555]"
                  }`}
                >
                  {item.editorial}
                </span>

                <span className="text-xs text-[#aaaaaa]">{item.count}</span>
              </Link>
            ))}
          </div>
        )}

        {mobileMenu === "colecciones" && (
          <div className="border-t border-[#e5e5e5] bg-white px-4 py-3">
            {indiceEditoriales.map((item) => (
              <div key={item.editorial} className="border-b border-[#eeeeee] py-3 last:border-b-0">
                <Link
                  href={`/editorial/${slugify(item.editorial)}`}
                  className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#999999]"
                >
                  {item.editorial}
                </Link>

                <div className="mt-2 space-y-1">
                  {item.collections.map((collection) => (
                    <Link
                      key={`${item.editorial}-${collection.name}`}
                      href={`/coleccion/${slugify(collection.name)}`}
                      className={`flex items-center justify-between py-1.5 ${
                        currentCollection === collection.name
                          ? "text-[#222222]"
                          : "text-[#666666]"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          currentCollection === collection.name
                            ? "font-medium"
                            : ""
                        }`}
                      >
                        {displayCollection(collection.name)}
                      </span>

                      <span className="text-xs text-[#aaaaaa]">
                        {collection.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          ÍNDICE TABLET / DESKTOP
          ===================================================== */}

      <aside className="hidden border-r border-[#e5e5e5] pr-5 md:block md:w-[180px] lg:w-[210px] lg:pr-8">
        <div className="sticky top-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#999999]">
            Índice
          </p>

          <nav className="mt-4 space-y-5">
            {indiceEditoriales.map((item) => {
              const editorialActive = currentEditorial === item.editorial;

              return (
                <div key={item.editorial}>
                  <Link
                    href={`/editorial/${slugify(item.editorial)}`}
                    className="group flex w-full items-center justify-between py-1 text-left"
                  >
                    <span
                      className={`text-xs transition ${
                        editorialActive
                          ? "font-semibold text-[#222222]"
                          : "font-medium text-[#444444] group-hover:text-[#111111]"
                      }`}
                    >
                      {item.editorial}
                    </span>

                    <span className="text-[10px] text-[#aaaaaa]">
                      {item.count}
                    </span>
                  </Link>

                  {item.collections.length > 0 && (
                    <div className="mt-1 border-l border-[#e5e5e5] pl-3">
                      {item.collections.map((collection) => {
                        const collectionActive =
                          currentCollection === collection.name;

                        return (
                          <Link
                            key={`${item.editorial}-${collection.name}`}
                            href={`/coleccion/${slugify(collection.name)}`}
                            className="group flex w-full items-center justify-between py-1.5 text-left"
                          >
                            <span
                              className={`truncate pr-2 text-[11px] transition ${
                                collectionActive
                                  ? "font-medium text-[#222222]"
                                  : "text-[#777777] group-hover:text-[#222222]"
                              }`}
                            >
                              {displayCollection(collection.name)}
                            </span>

                            <span className="shrink-0 text-[10px] text-[#b5b5b5]">
                              {collection.count}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-[#e5e5e5] pt-4">
            <p className="text-[9px] uppercase tracking-[0.25em] text-[#999999]">
              Archivo
            </p>

            <p className="mt-1 text-xs text-[#666666]">
              {magazines.length} revista
              {magazines.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
