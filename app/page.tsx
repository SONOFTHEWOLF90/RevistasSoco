"use client";

import Link from "next/link";

import { useState } from "react";

import { magazineCoverUrl, magazines, slugify } from "@/lib/catalog";

import MagazineSearch from "@/components/MagazineSearch";

import ContinueReading from "@/components/ContinueReading";

/* =========================================================

   ÍNDICE AUTOMÁTICO

   ========================================================= */

const editoriales = Array.from(

  new Set(magazines.map((magazine) => magazine.editorial)),

);

const colecciones = Array.from(

  new Set(magazines.map((magazine) => magazine.collection).filter(Boolean)),

).sort((a, b) => a.localeCompare(b, "es"));

type EditorialIndex = {

  editorial: string;

  count: number;

  collections: {

    name: string;

    count: number;

  }[];

};

const indiceEditoriales: EditorialIndex[] = editoriales.map((editorial) => {

const editorialMagazines = magazines.filter(

    (magazine) => magazine.editorial === editorial,

  );

const collections = Array.from(

    new Set(

      editorialMagazines.map((magazine) => magazine.collection).filter(Boolean),

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

/* =========================================================

   CONTADORES

   ========================================================= */

function getEditorialCount(editorial: string) {

  return magazines.filter((magazine) => magazine.editorial === editorial)

    .length;

}

function getCollectionCount(collection: string) {

  return magazines.filter((magazine) => magazine.collection === collection)

    .length;

}

/* =========================================================

   ORDENAR REVISTAS

   ========================================================= */

/**

 * Ordena por número descendente cuando existe.

 * Las revistas sin número quedan al final.

 */

function sortByIssueDesc<T extends { issue: string }>(items: T[]) {

  return [...items].sort((a, b) => {

const issueA = Number.parseInt(a.issue, 10);

const issueB = Number.parseInt(b.issue, 10);

    if (Number.isNaN(issueA) && Number.isNaN(issueB)) {

      return 0;

    }

    if (Number.isNaN(issueA)) {

      return 1;

    }

    if (Number.isNaN(issueB)) {

      return -1;

    }

    return issueB - issueA;

  });

}

/* =========================================================

   HOME

   ========================================================= */

export default function Home() {

const [mobileMenu, setMobileMenu] = useState<

    "editoriales" | "colecciones" | null

  >(null);

const [mobileSearch, setMobileSearch] = useState(false);

  /*
   * Para "Últimas incorporaciones" usamos la fecha real
   * de importación, de más reciente a más antigua.
   * Los registros antiguos sin fecha quedan al final.
   */
  const recentMagazines = [...magazines]
    .sort((a, b) => {
      const dateA = a.fecha_importacion
        ? Date.parse(a.fecha_importacion)
        : 0;
      const dateB = b.fecha_importacion
        ? Date.parse(b.fecha_importacion)
        : 0;

      const timestampA = Number.isFinite(dateA) ? dateA : 0;
      const timestampB = Number.isFinite(dateB) ? dateB : 0;

      return timestampB - timestampA;
    })
    .slice(0, 6);

  return (
    <main>

      {/* =====================================================

          HEADER

          ===================================================== */}

      <header className="border-b border-[#e5e5e5] bg-white">

        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-10">

          <div>

            <p className="text-[9px] font-medium tracking-[0.3em] text-[#999999] sm:text-[10px] sm:tracking-[0.35em]">

              ARCHIVO DIGITAL

            </p>

            <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">

              HEMEROTECA

            </h1>

          </div>

          {/* BUSCADOR ESCRITORIO */}

          <div className="hidden sm:block">

            <MagazineSearch />

          </div>

          {/* BUSCADOR MÓVIL */}

          <button

            type="button"

            aria-label="Buscar revistas"

            onClick={() => setMobileSearch((current) => !current)}

            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dedede] bg-[#fafafa] text-lg text-[#555555] transition hover:bg-[#f5f5f5] sm:hidden"

          >

            ⌕

          </button>

        </div>

      </header>

      {mobileSearch && (

        <section className="border-b border-[#e5e5e5] bg-white px-4 py-3 sm:hidden">

          <MagazineSearch />

        </section>

      )}

      {/* =====================================================

          ÍNDICE MÓVIL

          ===================================================== */}

      <section className="border-b border-[#e5e5e5] bg-[#fafafa] sm:hidden">

        <div className="grid grid-cols-2 divide-x divide-[#e5e5e5]">

          {/* EDITORIALES */}

          <button

            type="button"

            onClick={() =>

              setMobileMenu(mobileMenu === "editoriales" ? null : "editoriales")

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

          {/* COLECCIONES */}

          <button

            type="button"

            onClick={() =>

              setMobileMenu(mobileMenu === "colecciones" ? null : "colecciones")

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

        {/* ===================================================

            MENÚ EDITORIALES

            =================================================== */}

        {mobileMenu === "editoriales" && (

          <div className="border-t border-[#e5e5e5] bg-white px-4 py-3">

            {editoriales.map((editorial) => (

              <Link

                key={editorial}

                href={`/editorial/${slugify(editorial)}`}

                className="flex w-full items-center justify-between border-b border-[#eeeeee] py-3 text-left last:border-b-0"

              >

                <span className="text-sm text-[#555555]">{editorial}</span>

                <span className="text-xs text-[#aaaaaa]">

                  {getEditorialCount(editorial)}

                </span>

              </Link>

            ))}

          </div>

        )}

        {/* ===================================================

            MENÚ COLECCIONES

            =================================================== */}

        {mobileMenu === "colecciones" && (

          <div className="border-t border-[#e5e5e5] bg-white px-4 py-3">

            {colecciones.map((coleccion) => (

              <Link

                key={coleccion}

                href={`/coleccion/${slugify(coleccion)}`}

                className="flex w-full items-center justify-between border-b border-[#eeeeee] py-3 text-left last:border-b-0"

              >

                <span className="text-sm text-[#555555]">{coleccion}</span>

                <span className="text-xs text-[#aaaaaa]">

                  {getCollectionCount(coleccion)}

                </span>

              </Link>

            ))}

          </div>

        )}

      </section>

      {/* =====================================================

          CONTENIDO PRINCIPAL

          ===================================================== */}

      <section className="mx-auto grid max-w-[1600px] gap-6 px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10 lg:px-10">

        {/* ===================================================

            ÍNDICE ESCRITORIO

            =================================================== */}

        <aside className="hidden border-r border-[#e5e5e5] pr-5 md:block md:w-[180px] lg:w-[210px] lg:pr-8">

          <div className="sticky top-8">

            <div>

              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#999999]">

                Índice

              </p>

              <nav className="mt-4 space-y-5">

                {indiceEditoriales.map((item) => (

                  <div key={item.editorial}>

                    <Link

                      href={`/editorial/${slugify(item.editorial)}`}

                      className="group flex w-full items-center justify-between py-1 text-left"

                    >

                      <span className="text-xs font-medium text-[#444444] transition group-hover:text-[#111111]">

                        {item.editorial}

                      </span>

                      <span className="text-[10px] text-[#aaaaaa]">

                        {item.count}

                      </span>

                    </Link>

                    {item.collections.length > 0 && (

                      <div className="mt-1 border-l border-[#e5e5e5] pl-3">

                        {item.collections.map((collection) => (

                          <Link

                            key={`${item.editorial}-${collection.name}`}

                            href={`/coleccion/${slugify(collection.name)}`}

                            className="group flex w-full items-center justify-between py-1.5 text-left"

                          >

                            <span className="truncate pr-2 text-[11px] text-[#777777] transition group-hover:text-[#222222]">

                              {collection.name}

                            </span>

                            <span className="shrink-0 text-[10px] text-[#b5b5b5]">

                              {collection.count}

                            </span>

                          </Link>

                        ))}

                      </div>

                    )}

                  </div>

                ))}

              </nav>

            </div>

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

        {/* ===================================================

            BIBLIOTECA

            =================================================== */}

        <div className="min-w-0">

          {/* =================================================

              CONTINUAR LEYENDO

              ================================================= */}

          <ContinueReading />

          <div className="mt-12" />

          {/* =================================================

              ÚLTIMAS INCORPORACIONES

              ================================================= */}

          <section>

            <div className="mb-5 flex items-end justify-between border-b border-[#e5e5e5] pb-3 sm:mb-6 sm:pb-4">

              <div>

                <p className="text-[9px] uppercase tracking-[0.25em] text-[#999999] sm:text-[10px] sm:tracking-[0.28em]">

                  Archivo reciente

                </p>

                <h2 className="mt-1 text-lg font-semibold sm:text-xl">

                  Últimas incorporaciones

                </h2>

              </div>

              <span className="text-[11px] text-[#999999] sm:text-xs">

                {recentMagazines.length}

              </span>

            </div>

            {recentMagazines.length > 0 ? (

              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-9 md:grid-cols-4 xl:grid-cols-6">

                {recentMagazines.map((magazine) => (

                  <MagazineCard key={magazine.id} magazine={magazine} />

                ))}

              </div>

            ) : (

              <EmptyState />

            )}

          </section>

          {/* =================================================

              EXPLORAR

              ================================================= */}

          <section className="mt-14 sm:mt-16">

            <div className="mb-5 flex items-end justify-between border-b border-[#e5e5e5] pb-3 sm:mb-6 sm:pb-4">

              <div>

                <p className="text-[9px] uppercase tracking-[0.25em] text-[#999999] sm:text-[10px] sm:tracking-[0.28em]">

                  Biblioteca

                </p>

                <h2 className="mt-1 text-lg font-semibold sm:text-xl">

                  Explorar

                </h2>

              </div>

              <span className="text-[11px] text-[#999999] sm:text-xs">

                18 de {magazines.length}

              </span>

            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-9 md:grid-cols-4 xl:grid-cols-6">

              {(() => {

const shuffled = [...magazines];

                for (let i = shuffled.length - 1; i > 0; i--) {

const j = Math.floor(Math.random() * (i + 1));

                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];

                }

                return shuffled

                  .slice(0, 18)

                  .sort((a, b) => {

const editorialCompare = a.editorial.localeCompare(

b.editorial,

                      "es",

                      { sensitivity: "base" },

                    );

                    if (editorialCompare !== 0) {

                      return editorialCompare;

                    }

const collectionCompare = a.collection.localeCompare(

b.collection,

                      "es",

                      { sensitivity: "base" },

                    );

                    if (collectionCompare !== 0) {

                      return collectionCompare;

                    }

const issueA = Number.parseInt(a.issue, 10);

const issueB = Number.parseInt(b.issue, 10);

                    if (!Number.isNaN(issueA) && !Number.isNaN(issueB)) {

                      return issueA - issueB;

                    }

                    if (Number.isNaN(issueA)) {

                      return 1;

                    }

                    if (Number.isNaN(issueB)) {

                      return -1;

                    }

                    return a.issue.localeCompare(b.issue, "es", {

                      sensitivity: "base",

                    });

                  })

                  .map((magazine) => (

                    <MagazineCard key={magazine.id} magazine={magazine} />

                  ));

              })()}

            </div>

          </section>

        </div>

      </section>

      {/* =====================================================

          FOOTER

          ===================================================== */}

      <footer className="border-t border-[#e5e5e5] bg-[#fafafa]">

        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-7 text-[11px] text-[#888888] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-xs lg:px-10">

          <span>ALPACA HEMEROTECA</span>

          <span>Archivo digital privado</span>

        </div>

      </footer>

    </main>

  );

}

/* =========================================================

   TARJETA DE REVISTA

   ========================================================= */

function MagazineCard({ magazine }: { magazine: (typeof magazines)[number] }) {

  return (

    <Link href={`/revista/${magazine.id}`} className="group block">

      <article>

        <div className="overflow-hidden border border-[#e1e1e1] bg-white shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md">

          <img

            src={magazineCoverUrl(magazine)}

            alt={`${magazine.name}${

magazine.issue ? ` — Nº ${magazine.issue}` : ""

            }`}

            className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-[1.02]"

          />

        </div>

        <div className="pt-2.5 sm:pt-3">

          <p className="text-[8px] uppercase tracking-[0.18em] text-[#999999] sm:text-[9px] sm:tracking-[0.2em]">

            {magazine.collection}

          </p>

          <h3 className="mt-1 text-xs font-semibold tracking-tight text-[#333333] sm:text-sm">

            {magazine.issue ? `Nº ${magazine.issue}` : magazine.name}

          </h3>

        </div>

      </article>

    </Link>

  );

}

/* =========================================================

   ESTADO VACÍO

   ========================================================= */

function EmptyState() {

  return (

    <div className="border border-dashed border-[#dddddd] px-6 py-10 text-center sm:py-12">

      <p className="text-sm text-[#999999]">

        Todavía no hay revistas en esta sección.

      </p>

    </div>

  );

}
