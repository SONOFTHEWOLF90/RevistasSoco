"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL_PAGES = 176;

const R2_URL = "https://pub-1b95b888405e48679764699751c3bf8f.r2.dev";

function pageFile(page: number) {
  return `FAM-280-${String(page).padStart(3, "0")}.webp`;
}

function thumbFile(page: number) {
  return `${String(page).padStart(3, "0")}.webp`;
}

export default function Fam280Page() {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);

  const thumbnailRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const isCover = page === 1;

  const leftPage = isCover ? 1 : page % 2 === 0 ? page : page - 1;

  const rightPage = isCover ? null : leftPage + 1;

  const goPrevious = () => {
    setPage((current) => {
      if (current <= 1) {
        return 1;
      }

      if (current === 2 || current === 3) {
        return 1;
      }

      return current % 2 === 0 ? current - 2 : current - 3;
    });
  };

  const goNext = () => {
    setPage((current) => {
      if (current === 1) {
        return 2;
      }

      const next = current % 2 === 0 ? current + 2 : current + 1;

      return Math.min(TOTAL_PAGES, next);
    });
  };

  const goToPage = (newPage: number) => {
    setPage(newPage);
  };

  const zoomIn = () => {
    setZoom((current) => Math.min(180, current + 10));
  };

  const zoomOut = () => {
    setZoom((current) => Math.max(70, current - 10));
  };

  const resetZoom = () => {
    setZoom(100);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goPrevious();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }

      if (event.key === "Home") {
        setPage(1);
      }

      if (event.key === "End") {
        setPage(TOTAL_PAGES % 2 === 0 ? TOTAL_PAGES - 1 : TOTAL_PAGES);
      }

      if (event.key === "+") {
        zoomIn();
      }

      if (event.key === "-") {
        zoomOut();
      }

      if (event.key === "0") {
        resetZoom();
      }

      if (event.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const thumbnail = thumbnailRefs.current[page];

    if (thumbnail) {
      thumbnail.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [page]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <main className="h-screen overflow-hidden bg-[#20201e] text-white">
      {/* HEADER */}
      <header className="h-[64px] border-b border-white/[0.08] bg-[#191917]">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-5 lg:px-8">
          <div>
            <p className="text-[9px] uppercase tracking-[0.32em] text-white/35">
              Lang Yarns · FAM
            </p>

            <h1 className="mt-1 text-sm font-medium text-white/90">
              FAM — Nº 280
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/40 sm:block">
              {isCover
                ? `Página 1 de ${TOTAL_PAGES}`
                : `Páginas ${leftPage}–${
                    rightPage && rightPage <= TOTAL_PAGES ? rightPage : leftPage
                  } de ${TOTAL_PAGES}`}
            </span>

            {/* ZOOM */}
            <div className="flex items-center overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
              <button
                onClick={zoomOut}
                className="px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Alejar"
              >
                −
              </button>

              <button
                onClick={resetZoom}
                className="min-w-[52px] border-x border-white/10 px-2 py-2 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                {zoom}%
              </button>

              <button
                onClick={zoomIn}
                className="px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Acercar"
              >
                +
              </button>
            </div>

            {/* FULLSCREEN */}
            <button
              onClick={toggleFullscreen}
              className="hidden rounded-md border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-white/20 hover:bg-white/5 hover:text-white sm:block"
            >
              {isFullscreen ? "Salir" : "Pantalla completa"}
            </button>

            {/* BACK */}
            <button
              onClick={() => window.history.back()}
              className="rounded-md border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Volver
            </button>
          </div>
        </div>
      </header>

      {/* VISOR */}
      <section
        ref={viewerRef}
        className="relative flex h-[calc(100vh-64px-112px)] items-center justify-center overflow-hidden bg-[#20201e] px-16 py-4"
      >
        {/* ANTERIOR */}
        <button
          onClick={goPrevious}
          disabled={page === 1}
          aria-label="Página anterior"
          className="absolute left-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#191917]/80 text-lg text-white/50 backdrop-blur-md transition hover:border-white/20 hover:bg-[#30302d] hover:text-white disabled:pointer-events-none disabled:opacity-10"
        >
          ←
        </button>

        {/* ÁREA DEL LIBRO */}
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          {isCover ? (
            /* PORTADA */
            <div
              className="flex h-full items-center justify-center"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "center center",
              }}
            >
              <img
                src={`${R2_URL}/magazines/lang-yarns/fam/280/${pageFile(1)}`}
                alt="FAM Nº 280 — Portada"
                className="block max-h-full max-w-full object-contain shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              />
            </div>
          ) : (
            /* DOBLE PÁGINA */
            <div
              className="flex max-h-full max-w-full items-center justify-center"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "center center",
              }}
            >
              <div className="flex max-h-full max-w-full items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                {/* IZQUIERDA */}
                <img
                  src={`${R2_URL}/magazines/lang-yarns/fam/280/${pageFile(
                    leftPage,
                  )}`}
                  alt={`FAM Nº 280 — Página ${leftPage}`}
                  className="block max-h-[calc(100vh-64px-120px)] max-w-[calc(50vw-70px)] object-contain"
                />

                {/* CENTRO */}
                {rightPage !== null && rightPage <= TOTAL_PAGES && (
                  <img
                    src={`${R2_URL}/magazines/lang-yarns/fam/280/${pageFile(
                      rightPage,
                    )}`}
                    alt={`FAM Nº 280 — Página ${rightPage}`}
                    className="block max-h-[calc(100vh-64px-120px)] max-w-[calc(50vw-70px)] object-contain"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* SIGUIENTE */}
        <button
          onClick={goNext}
          disabled={page >= TOTAL_PAGES}
          aria-label="Página siguiente"
          className="absolute right-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#191917]/80 text-lg text-white/50 backdrop-blur-md transition hover:border-white/20 hover:bg-[#30302d] hover:text-white disabled:pointer-events-none disabled:opacity-10"
        >
          →
        </button>

        {/* INDICADOR */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#1d1c1a]/80 px-4 py-1.5 text-[11px] text-white/45 backdrop-blur">
          {isCover
            ? "1"
            : `${leftPage}–${
                rightPage !== null && rightPage <= TOTAL_PAGES
                  ? rightPage
                  : leftPage
              }`}
        </div>
      </section>

      {/* MINIATURAS */}
      <section className="h-[112px] border-t border-white/[0.08] bg-[#191917]">
        <div className="flex h-full items-center gap-2 overflow-x-auto px-5 py-3">
          {Array.from({ length: TOTAL_PAGES }, (_, index) => {
            const thumbnailPage = index + 1;

            const active = isCover
              ? thumbnailPage === 1
              : thumbnailPage === leftPage || thumbnailPage === rightPage;

            return (
              <button
                key={thumbnailPage}
                ref={(element) => {
                  thumbnailRefs.current[thumbnailPage] = element;
                }}
                onClick={() => goToPage(thumbnailPage)}
                className={`group relative flex h-[84px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-sm border transition-all ${
                  active
                    ? "border-white/80 ring-2 ring-white/20"
                    : "border-white/[0.08] opacity-55 hover:border-white/30 hover:opacity-100"
                }`}
              >
                <img
                  src={`${R2_URL}/magazines/lang-yarns/fam/280/thumbs/${thumbFile(
                    thumbnailPage,
                  )}`}
                  alt={`Página ${thumbnailPage}`}
                  loading={thumbnailPage <= 8 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />

                <span
                  className={`absolute bottom-0 left-0 right-0 bg-black/65 py-0.5 text-center text-[9px] ${
                    active ? "text-white" : "text-white/60"
                  }`}
                >
                  {thumbnailPage}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
