"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type Mode = "menu" | "importar" | "editar";

type Magazine = {
  id: string;
  editorial: string;
  collection: string;
  issue: string;
  name: string;
  file: string;
  pages?: number;
  r2Path?: string;
  cover?: string;
};

type ImportResult = {
  success: boolean;
  status?: "queued" | "processing" | "completed" | "failed";
  error?: string;
  output?: string;
  importId?: string;
  magazine?: {
    editorial: string;
    collection: string;
    issue: string;
    name: string;
    pages: number;
    r2Path: string;
  };
};

type EditResult = {
  success: boolean;
  error?: string;
  magazine?: Magazine;
};

export default function ImportadorPage() {
  const [mode, setMode] = useState<Mode>("menu");

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-[#222222]">
      <header className="border-b border-[#e3e3e3] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-7 lg:px-10">
          <p className="text-[9px] font-medium tracking-[0.3em] text-[#999999]">
            ALPACA HEMEROTECA
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Centro de gestión
          </h1>

          <p className="mt-1 text-sm text-[#888888]">
            Importar y editar revistas
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
        {mode === "menu" && <ModeSelector onSelect={setMode} />}

        {mode === "importar" && (
          <ImportMagazine onBack={() => setMode("menu")} />
        )}

        {mode === "editar" && <EditMagazine onBack={() => setMode("menu")} />}
      </div>
    </main>
  );
}

function ModeSelector({
  onSelect,
}: {
  onSelect: (mode: "importar" | "editar") => void;
}) {
  return (
    <section>
      <div className="mb-8">
        <p className="text-[9px] uppercase tracking-[0.25em] text-[#999999]">
          Hemeroteca
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          ¿Qué deseas hacer?
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-[#888888]">
          Gestiona las revistas nuevas y modifica las que ya forman parte del
          archivo digital.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ActionCard
          eyebrow="Nueva revista"
          title="Importar revista"
          description="Selecciona un PDF local, completa los datos y envíalo al archivo digital."
          icon="↓"
          onClick={() => onSelect("importar")}
        />

        <ActionCard
          eyebrow="Revista existente"
          title="Editar revista"
          description="Busca una revista para modificar sus datos o reemplazar su PDF."
          icon="✎"
          onClick={() => onSelect("editar")}
        />
      </div>
    </section>
  );
}

function ActionCard({
  eyebrow,
  title,
  description,
  icon,
  onClick,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group border border-[#dedede] bg-white p-7 text-left transition hover:border-[#bdbdbd] hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em] text-[#999999]">
            {eyebrow}
          </p>

          <h3 className="mt-3 text-xl font-semibold">{title}</h3>

          <p className="mt-3 max-w-md text-sm leading-6 text-[#777777]">
            {description}
          </p>
        </div>

        <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#e1e1e1] text-lg text-[#555555] transition group-hover:border-[#bbb]">
          {icon}
        </span>
      </div>

      <div className="mt-8 text-[10px] font-medium uppercase tracking-[0.2em] text-[#777777]">
        Abrir →
      </div>
    </button>
  );
}

function ImportMagazine({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [editorial, setEditorial] = useState("");
  const [collection, setCollection] = useState("");
  const [issue, setIssue] = useState("");
  const [name, setName] = useState("");

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    setFile(selected);
    setError("");
    setResult(null);

    if (selected && !name) {
      setName(selected.name.replace(/\.pdf$/i, "").trim());
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Selecciona un archivo PDF.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("El archivo debe ser un PDF.");
      return;
    }

    if (!editorial.trim()) {
      setError("Escribe la editorial.");
      return;
    }

    if (!collection.trim()) {
      setError("Escribe la colección.");
      return;
    }

    if (!issue.trim()) {
      setError("Escribe el número.");
      return;
    }

    if (!name.trim()) {
      setError("Escribe el nombre de la revista.");
      return;
    }

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("pdf", file);
      formData.append("editorial", editorial.trim());
      formData.append("collection", collection.trim());
      formData.append("issue", issue.trim());
      formData.append("name", name.trim());

      const response = await fetch("/api/importador/importar", {
        method: "POST",
        body: formData,
      });

      const data: ImportResult = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo importar la revista.");
      }

      setResult(data);

      if (!data.importId) {
        throw new Error(
          "La importación fue enviada, pero no se recibió su identificador.",
        );
      }

      let finished = false;

      while (!finished) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusResponse = await fetch(
          `/api/importador/estado?importId=${encodeURIComponent(data.importId)}`,
          {
            cache: "no-store",
          },
        );

        const statusData = await statusResponse.json();

        if (!statusResponse.ok || !statusData.success) {
          throw new Error(
            statusData.error ||
              "No se pudo consultar el estado de la importación.",
          );
        }

        setResult((current) =>
          current
            ? {
                ...current,
                status: statusData.status,
                magazine: current.magazine
                  ? {
                      ...current.magazine,
                      pages: statusData.pages ?? current.magazine.pages,
                      r2Path: statusData.r2Path ?? current.magazine.r2Path,
                    }
                  : current.magazine,
              }
            : current,
        );

        if (statusData.status === "completed") {
          finished = true;
        }

        if (statusData.status === "failed") {
          throw new Error(
            "La importación terminó con errores. Revisa GitHub Actions para ver el detalle.",
          );
        }
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error durante la importación.",
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <section>
      <BackButton onClick={onBack} disabled={importing} />

      <div className="mt-8 max-w-3xl">
        <p className="text-[9px] uppercase tracking-[0.25em] text-[#999999]">
          Nueva revista
        </p>

        <h2 className="mt-2 text-2xl font-semibold">Importar revista</h2>

        <p className="mt-2 text-sm text-[#888888]">
          El PDF se procesará localmente y sus páginas se subirán a R2.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 max-w-3xl">
        <div className="border border-[#dedede] bg-white">
          <div className="border-b border-[#e5e5e5] p-6">
            <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#888888]">
              PDF
            </label>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFile}
              className="mt-3 block w-full cursor-pointer text-sm text-[#555555] file:mr-4 file:border-0 file:bg-[#222222] file:px-4 file:py-3 file:text-xs file:font-medium file:text-white"
            />

            {file && (
              <p className="mt-3 font-mono text-xs text-[#888888]">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <Field
              label="Editorial"
              value={editorial}
              onChange={setEditorial}
              placeholder="Ej. Lana Grossa"
            />

            <Field
              label="Colección"
              value={collection}
              onChange={setCollection}
              placeholder="Ej. Filati-Stricken"
            />

            <Field
              label="Número"
              value={issue}
              onChange={setIssue}
              placeholder="Ej. 14"
            />

            <Field
              label="Nombre"
              value={name}
              onChange={setName}
              placeholder="Nombre de la revista"
            />
          </div>

          {error && (
            <div className="mx-6 mb-6 border border-[#e0d0d0] bg-[#faf5f5] px-5 py-4">
              <p className="text-sm font-medium text-[#805555]">{error}</p>
            </div>
          )}

          {result?.success && result.status && (
            <div className="mx-6 mb-6 border border-[#d8d8d8] bg-[#fafafa] px-5 py-5">
              {result.status === "queued" && (
                <>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#999999]">
                    Importación en cola
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    Revista enviada correctamente
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#777777]">
                    La revista está esperando para comenzar el procesamiento.
                  </p>

                  <p className="mt-4 text-xs font-medium text-[#555555]">
                    No vuelvas a enviar esta revista.
                  </p>
                </>
              )}

              {result.status === "processing" && (
                <>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#999999]">
                    Procesando revista
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    El procesamiento está en curso
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#777777]">
                    Estamos convirtiendo las páginas y preparando los archivos.
                  </p>

                  <p className="mt-4 text-xs font-medium text-[#555555]">
                    No vuelvas a enviar esta revista.
                  </p>
                </>
              )}

              {result.status === "completed" && result.magazine && (
                <>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#999999]">
                    Importación completada
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    {result.magazine.name}
                  </p>

                  <p className="mt-1 text-sm text-[#777777]">
                    {result.magazine.editorial} · {result.magazine.collection} ·
                    Nº {result.magazine.issue}
                  </p>

                  <p className="mt-3 text-xs text-[#888888]">
                    {result.magazine.pages} páginas · R2:{" "}
                    {result.magazine.r2Path}
                  </p>
                </>
              )}

              {result.status === "failed" && (
                <>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#805555]">
                    Importación fallida
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    No se pudo completar la revista
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#777777]">
                    El procesamiento terminó con errores. Puedes revisar el
                    detalle en GitHub Actions.
                  </p>
                </>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-[#e5e5e5] bg-[#fafafa] p-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onBack}
              disabled={importing}
              className="border border-[#d8d8d8] bg-white px-6 py-3 text-xs font-medium text-[#555555] hover:bg-[#f5f5f5]"
            >
              VOLVER
            </button>

            <button
              type="submit"
              disabled={importing}
              className="bg-[#222222] px-6 py-3 text-xs font-medium text-white hover:bg-[#444444] disabled:cursor-wait disabled:opacity-60"
            >
              {importing ? "IMPORTANDO..." : "IMPORTAR REVISTA"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function EditMagazine({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [selected, setSelected] = useState<Magazine | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editorial, setEditorial] = useState("");
  const [collection, setCollection] = useState("");
  const [issue, setIssue] = useState("");
  const [name, setName] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [replacementPdf, setReplacementPdf] = useState<File | null>(null);
  const [replacementPages, setReplacementPages] = useState<number | null>(null);
  const [replacing, setReplacing] = useState(false);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return magazines.slice(0, 30);
    }

    return magazines.filter((magazine) =>
      [
        magazine.editorial,
        magazine.collection,
        magazine.issue,
        magazine.name,
        magazine.file,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [magazines, query]);

  async function loadMagazines() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/importador/listar", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudieron cargar las revistas.");
      }

      setMagazines(data.magazines);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las revistas.",
      );
    } finally {
      setLoading(false);
    }
  }

  function selectMagazine(magazine: Magazine) {
    setSelected(magazine);
    setEditorial(magazine.editorial);
    setCollection(magazine.collection);
    setIssue(magazine.issue);
    setName(magazine.name);
    setReplacementPdf(null);
    setReplacementPages(null);
    setMessage("");
    setError("");
  }

  async function saveChanges() {
    if (!selected) return;

    if (!editorial.trim() || !collection.trim() || !issue.trim()) {
      setError("Editorial, colección y número son obligatorios.");
      return;
    }

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/importador/editar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selected.id,
          editorial: editorial.trim(),
          collection: collection.trim(),
          issue: issue.trim(),
          name: name.trim(),
        }),
      });

      const data: EditResult = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudieron guardar los cambios.");
      }

      if (data.magazine) {
        setSelected(data.magazine);

        setMagazines((current) =>
          current.map((magazine) =>
            magazine.id === data.magazine?.id ? data.magazine : magazine,
          ),
        );

        setEditorial(data.magazine.editorial);
        setCollection(data.magazine.collection);
        setIssue(data.magazine.issue);
        setName(data.magazine.name);
      }

      setMessage("Cambios guardados correctamente.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteMagazine() {
    if (!selected) return;

    const confirmed = window.confirm(
      `¿Eliminar la revista "${selected.name}"?\n\nEsta acción eliminará la revista y sus archivos de R2.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/importador/eliminar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selected.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo eliminar la revista.");
      }

      setMagazines((current) =>
        current.filter((magazine) => magazine.id !== selected.id),
      );

      setSelected(null);
      setEditorial("");
      setCollection("");
      setIssue("");
      setName("");

      setMessage("Revista eliminada correctamente.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la revista.",
      );
    }
  }

  return (
    <section>
      <BackButton onClick={onBack} />

      <div className="mt-8">
        <p className="text-[9px] uppercase tracking-[0.25em] text-[#999999]">
          Revista existente
        </p>

        <h2 className="mt-2 text-2xl font-semibold">Editar revista</h2>

        <p className="mt-2 text-sm text-[#888888]">
          Busca una revista del catálogo para modificar sus datos.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="border border-[#dedede] bg-white">
          <div className="border-b border-[#e5e5e5] p-5">
            <label className="text-[9px] uppercase tracking-[0.2em] text-[#999999]">
              Buscar
            </label>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (magazines.length === 0) {
                  loadMagazines();
                }
              }}
              placeholder="Editorial, colección, número..."
              className="mt-3 w-full border border-[#dedede] px-4 py-3 text-sm outline-none focus:border-[#999999]"
            />
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {loading && (
              <p className="px-5 py-8 text-center text-xs text-[#999999]">
                Cargando revistas...
              </p>
            )}

            {!loading && magazines.length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-[#999999]">
                Escribe una búsqueda para comenzar.
              </p>
            )}

            {!loading &&
              filtered.map((magazine) => (
                <button
                  key={magazine.id}
                  type="button"
                  onClick={() => selectMagazine(magazine)}
                  className={`w-full border-b border-[#eeeeee] px-5 py-4 text-left transition hover:bg-[#fafafa] ${
                    selected?.id === magazine.id ? "bg-[#f5f5f5]" : ""
                  }`}
                >
                  <p className="text-sm font-medium">{magazine.name}</p>

                  <p className="mt-1 text-xs text-[#888888]">
                    {magazine.editorial} · {magazine.collection} · Nº{" "}
                    {magazine.issue}
                  </p>
                </button>
              ))}
          </div>
        </section>

        <section className="border border-[#dedede] bg-white">
          {!selected ? (
            <div className="flex min-h-[500px] items-center justify-center px-8 text-center">
              <div>
                <p className="text-3xl">✎</p>

                <p className="mt-4 text-sm font-medium">
                  Selecciona una revista
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-[#999999]">
                  Aquí aparecerán sus datos y las opciones de edición.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-[#e5e5e5] p-6">
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#999999]">
                  Datos de la revista
                </p>

                <h3 className="mt-2 text-xl font-semibold">{selected.name}</h3>

                {selected.pages && (
                  <p className="mt-1 text-xs text-[#999999]">
                    {selected.pages} páginas
                  </p>
                )}
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <Field
                  label="Editorial"
                  value={editorial}
                  onChange={setEditorial}
                />

                <Field
                  label="Colección"
                  value={collection}
                  onChange={setCollection}
                />

                <Field label="Número" value={issue} onChange={setIssue} />

                <Field label="Nombre" value={name} onChange={setName} />
              </div>

              {error && (
                <div className="mx-6 mb-5 border border-[#e0d0d0] bg-[#faf5f5] px-5 py-4">
                  <p className="text-sm text-[#805555]">{error}</p>
                </div>
              )}

              {message && (
                <div className="mx-6 mb-5 border border-[#d8d8d8] bg-[#fafafa] px-5 py-4">
                  <p className="text-sm text-[#555555]">{message}</p>
                </div>
              )}

              <div className="border-t border-[#e5e5e5] p-6">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={saveChanges}
                    disabled={saving}
                    className="bg-[#222222] px-6 py-3 text-xs font-medium text-white hover:bg-[#444444] disabled:opacity-60"
                  >
                    {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                  </button>

                  <button
                    type="button"
                    onClick={deleteMagazine}
                    disabled={saving}
                    className="border border-[#cc0000] px-6 py-3 text-xs font-medium text-[#cc0000] hover:bg-[#fff5f5] disabled:opacity-60"
                  >
                    ELIMINAR REVISTA
                  </button>
                </div>
              </div>

              <div className="border-t border-[#e5e5e5] bg-[#fafafa] p-6">
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#999999]">
                  Contenido
                </p>

                <h4 className="mt-2 text-base font-semibold">Reemplazar PDF</h4>

                <p className="mt-1 max-w-xl text-xs leading-5 text-[#888888]">
                  Esta opción reprocesará todas las páginas de la revista y
                  reemplazará su contenido en R2.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("replace-pdf-input")?.click();
                  }}
                  className="mt-5 border border-[#222222] bg-white px-6 py-3 text-xs font-medium text-[#222222] hover:bg-[#f5f5f5]"
                >
                  REEMPLAZAR PDF
                </button>

                <input
                  id="replace-pdf-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (!file) {
                      return;
                    }

                    setReplacementPdf(file);
                    setReplacementPages(null);
                    setError("");
                    setMessage("");
                  }}
                />
                {replacementPdf && (
                  <div className="mt-5 border border-[#dedede] bg-white p-4">
                    <p className="text-xs font-medium text-[#222222]">
                      {replacementPdf.name}
                    </p>

                    <p className="mt-1 text-[11px] text-[#999999]">
                      {formatBytes(replacementPdf.size)}
                    </p>

                    <p className="mt-3 text-[11px] leading-5 text-[#777777]">
                      Este PDF reemplazará todas las páginas actuales de esta
                      revista.
                    </p>

                    <button
                      type="button"
                      onClick={async () => {
                        setError("");
                        setMessage("");

                        try {
                          const formData = new FormData();
                          formData.append("file", replacementPdf);

                          const response = await fetch(
                            "/api/importador/reemplazar/preview",
                            {
                              method: "POST",
                              body: formData,
                            },
                          );

                          const data = await response.json();

                          if (!response.ok || !data.success) {
                            throw new Error(
                              data.error || "No se pudo analizar el PDF.",
                            );
                          }

                          setReplacementPages(data.pages);

                          setMessage(
                            `PDF analizado correctamente: ${data.pages} páginas.`,
                          );
                        } catch (error) {
                          setError(
                            error instanceof Error
                              ? error.message
                              : "No se pudo analizar el PDF.",
                          );
                        }
                      }}
                      className="mt-4 bg-[#222222] px-5 py-3 text-xs font-medium text-white hover:bg-[#444444]"
                    >
                      ANALIZAR PDF
                    </button>
                    {replacementPages !== null && (
                      <div className="mt-4 border border-[#dedede] bg-[#f7f7f7] p-4">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#999999]">
                          Nuevo PDF
                        </p>

                        <p className="mt-2 text-sm font-medium text-[#222222]">
                          {replacementPages} páginas
                        </p>

                        <p className="mt-1 text-xs text-[#777777]">
                          La revista actual tiene {selected?.pages ?? 0}{" "}
                          páginas.
                        </p>

                        <p className="mt-3 text-xs leading-5 text-[#777777]">
                          El reemplazo conservará la misma revista y su
                          ubicación en el catálogo.
                        </p>

                        <button
                          type="button"
                          disabled={replacing}
                          onClick={async () => {
                            if (
                              !selected ||
                              !replacementPdf ||
                              replacementPages === null
                            ) {
                              setError(
                                "Selecciona y analiza un PDF antes de confirmar.",
                              );
                              return;
                            }

                            const confirmed = window.confirm(
                              `Vas a reemplazar el contenido de ${selected.name} (${selected.pages ?? 0} páginas) por ${replacementPages} páginas.\\n\\nSe hará un respaldo de R2 antes de reemplazar el contenido.\\n\\n¿Deseas continuar?`,
                            );

                            if (!confirmed) {
                              return;
                            }

                            setReplacing(true);
                            setError("");
                            setMessage("");

                            try {
                              const formData = new FormData();
                              formData.append("pdf", replacementPdf);
                              formData.append("r2Path", selected.r2Path ?? "");
                              formData.append(
                                "expectedPages",
                                String(replacementPages),
                              );

                              const response = await fetch(
                                "/api/importador/reemplazar",
                                {
                                  method: "POST",
                                  body: formData,
                                },
                              );

                              const data = await response.json();

                              if (!response.ok || !data.success) {
                                throw new Error(
                                  data.error || "No se pudo reemplazar el PDF.",
                                );
                              }

                              setMessage(
                                `Reemplazo completado correctamente: ${data.pages} páginas. El respaldo quedó en ${data.backup ?? "la carpeta de respaldos"}.`,
                              );

                              setSelected((current) =>
                                current
                                  ? { ...current, pages: data.pages }
                                  : current,
                              );

                              setMagazines((current) =>
                                current.map((magazine) =>
                                  magazine.id === selected.id
                                    ? { ...magazine, pages: data.pages }
                                    : magazine,
                                ),
                              );

                              setReplacementPdf(null);
                              setReplacementPages(null);

                              const input = document.getElementById(
                                "replace-pdf-input",
                              ) as HTMLInputElement | null;

                              if (input) {
                                input.value = "";
                              }
                            } catch (error) {
                              setError(
                                error instanceof Error
                                  ? error.message
                                  : "No se pudo reemplazar el PDF.",
                              );
                            } finally {
                              setReplacing(false);
                            }
                          }}
                          className="mt-4 bg-[#222222] px-5 py-3 text-xs font-medium text-white hover:bg-[#444444] disabled:cursor-wait disabled:opacity-60"
                        >
                          {replacing
                            ? "REEMPLAZANDO..."
                            : "CONFIRMAR REEMPLAZO"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#999999]">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full border border-[#dedede] bg-white px-4 py-3 text-sm outline-none focus:border-[#999999]"
      />
    </label>
  );
}

function BackButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#777777] hover:text-[#222222] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[#777777]"
    >
      ← Volver
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
