import Link from "next/link";
import { notFound } from "next/navigation";

import {
  displayCollection,
  magazineCoverUrl,
  magazines,
  slugify,
} from "@/lib/catalog";
import GlobalIndex from "@/components/GlobalIndex";

function getEditorialName(slug: string) {
  return magazines.find((magazine) => slugify(magazine.editorial) === slug)
    ?.editorial;
}

export default async function EditorialPage({
  params,
}: {
  params: Promise<{ editorial: string }>;
}) {
  const { editorial: slug } = await params;

  const editorial = getEditorialName(slug);

  if (!editorial) {
    notFound();
  }

  const editorialMagazines = magazines.filter(
    (magazine) => slugify(magazine.editorial) === slug,
  );

  const collections = [
    ...new Set(editorialMagazines.map((magazine) => magazine.collection)),
  ];

  return (
    <main className="min-h-screen bg-white text-[#222222]">
      {/* HEADER */}
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
          <Link href="/" className="group">
            <p className="text-[9px] font-medium tracking-[0.3em] text-[#999999] sm:text-[10px]">
              ARCHIVO DIGITAL
            </p>

            <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">
              HEMEROTECA
            </h1>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#dedede] bg-[#fafafa] px-4 py-2 text-xs text-[#666666] transition hover:bg-[#f5f5f5]"
          >
            ← Volver
          </Link>
        </div>
      </header>

      {/* CABECERA */}
      <section className="mx-auto max-w-[1600px] px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12 lg:px-10">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#999999]">
          Editorial
        </p>

        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {editorial}
        </h2>

        <p className="mt-3 text-sm text-[#777777]">
          {editorialMagazines.length} revista
          {editorialMagazines.length !== 1 ? "s" : ""}
          {" · "}
          {collections.length} colección
          {collections.length !== 1 ? "es" : ""}
        </p>
      </section>

      {/* CONTENIDO */}
      <section className="mx-auto grid max-w-[1600px] gap-6 px-4 pb-20 sm:px-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10 lg:px-10">
        <GlobalIndex currentEditorial={editorial} />

        <div>
          {collections.length > 0 ? (
          collections.map((collection) => {
            const collectionMagazines = editorialMagazines.filter(
              (magazine) => magazine.collection === collection,
            );

            return (
              <section key={collection} className="mb-14 last:mb-0">
                {/* COLECCIÓN */}
                <div className="mb-5 flex items-end justify-between border-b border-[#e5e5e5] pb-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.25em] text-[#999999]">
                      Colección
                    </p>

                    <h3 className="mt-1 text-xl font-semibold">
                      {displayCollection(collection)}
                    </h3>
                  </div>

                  <span className="text-xs text-[#999999]">
                    {collectionMagazines.length} revista
                    {collectionMagazines.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* REVISTAS */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-9 md:grid-cols-4 xl:grid-cols-6">
                  {collectionMagazines.map((magazine) => (
                    <MagazineCard key={magazine.id} magazine={magazine} />
                  ))}
                </div>
              </section>
            );
          })
          ) : (
            <EmptyState />
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#e5e5e5] bg-[#fafafa]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-7 text-[11px] text-[#888888] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-xs lg:px-10">
          <span>ALPACA HEMEROTECA</span>
          <span>Archivo digital privado</span>
        </div>
      </footer>
    </main>
  );
}

function MagazineCard({ magazine }: { magazine: (typeof magazines)[number] }) {
  const issueLabel = magazine.issue?.trim()
    ? `Nº ${magazine.issue}`
    : "Sin número";

  return (
    <Link href={`/revista/${magazine.id}`} className="group block">
      <article>
        <div className="overflow-hidden border border-[#e1e1e1] bg-white shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
          <img
            src={magazineCoverUrl(magazine)}
            alt={`${magazine.name}${magazine.issue ? ` — Nº ${magazine.issue}` : ""}`}
            className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        </div>

        <div className="pt-2.5">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[#999999] sm:text-[9px]">
            Colección
          </p>

          <p className="mt-1 text-xs font-medium text-[#555555] sm:text-sm">
            {displayCollection(magazine.collection)}
          </p>

          <h4 className="mt-1 text-xs font-semibold text-[#333333] sm:text-sm">
            {magazine.name}
          </h4>

          <p className="mt-0.5 text-[10px] text-[#888888] sm:text-xs">
            {issueLabel}
          </p>
        </div>
      </article>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[#dddddd] px-6 py-12 text-center">
      <p className="text-sm text-[#999999]">
        No hay revistas disponibles en esta editorial.
      </p>
    </div>
  );
}
