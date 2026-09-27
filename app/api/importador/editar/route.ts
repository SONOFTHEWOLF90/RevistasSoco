import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type CatalogMagazine = {
  estado?: string;
  editorial?: string;
  coleccion?: string;
  numero?: string | number;
  nombre?: string;
  archivo?: string;
  ruta?: string;
  paginas?: number;
  r2_path?: string;
  prefix?: string;
  cover?: string;
  fecha_importacion?: string;
  origen?: string;
};

function createMagazineId(
  magazine: CatalogMagazine,
  index: number,
) {
  return [
    magazine.editorial ?? "",
    magazine.coleccion ?? "",
    String(magazine.numero ?? ""),
    magazine.nombre ?? "",
    magazine.archivo ?? "",
    index,
  ]
    .join("|")
    .toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      editorial,
      collection,
      issue,
      name,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "No se recibió el identificador de la revista.",
        },
        { status: 400 },
      );
    }

    if (!editorial?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "La editorial es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (!collection?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "La colección es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "El nombre es obligatorio.",
        },
        { status: 400 },
      );
    }

    // El último elemento del ID es el índice original
    const parts = String(id).split("|");
    const index = Number(parts[parts.length - 1]);

    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Identificador de revista inválido.",
        },
        { status: 400 },
      );
    }

    const catalogPath = path.join(
      process.cwd(),
      "catalogo.json",
    );

    const catalogRaw = await fs.readFile(
      catalogPath,
      "utf8",
    );

    const catalog = JSON.parse(catalogRaw) as CatalogMagazine[];

    if (!catalog[index]) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró la revista en el catálogo.",
        },
        { status: 404 },
      );
    }

    const magazine = catalog[index];

    /*
     * IMPORTANTE:
     * Aquí solo modificamos los metadatos.
     *
     * NO cambiamos:
     * - r2_path
     * - archivo
     * - ruta
     * - páginas
     * - prefix
     * - cover
     * - fecha de importación
     *
     * Esto evita romper las imágenes que ya están funcionando
     * en R2.
     */

    magazine.editorial = editorial.trim();
    magazine.coleccion = collection.trim();
    magazine.numero = String(issue ?? "").trim();
    magazine.nombre = name.trim();

    /*
     * Escritura atómica:
     * primero escribimos un archivo temporal y después
     * reemplazamos catalogo.json.
     */

    const temporaryPath = `${catalogPath}.tmp`;

    await fs.writeFile(
      temporaryPath,
      JSON.stringify(catalog, null, 2) + "\n",
      "utf8",
    );

    await fs.rename(
      temporaryPath,
      catalogPath,
    );

    const updatedMagazine = {
      id: createMagazineId(magazine, index),
      editorial: magazine.editorial ?? "",
      collection: magazine.coleccion ?? "",
      issue: String(magazine.numero ?? ""),
      name: magazine.nombre ?? "",
      file: magazine.archivo ?? "",
      pages: magazine.paginas,
      r2Path: magazine.r2_path,
      cover: magazine.cover,
    };

    return NextResponse.json({
      success: true,
      message: "Revista actualizada correctamente.",
      magazine: updatedMagazine,
    });

  } catch (error) {
    console.error("Error editando revista:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudieron guardar los cambios.",
      },
      { status: 500 },
    );
  }
}