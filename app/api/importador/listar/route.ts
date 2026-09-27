import { NextResponse } from "next/server";
import catalogData from "../../../../catalogo.json";

type CatalogMagazine = {
  editorial?: string;
  coleccion?: string;
  numero?: string | number;
  nombre?: string;
  archivo?: string;
  paginas?: number;
  r2_path?: string;
  cover?: string;
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

export async function GET() {
  try {
    const magazines = (catalogData as CatalogMagazine[]).map(
      (magazine, index) => ({
        id: createMagazineId(magazine, index),
        editorial: magazine.editorial ?? "",
        collection: magazine.coleccion ?? "",
        issue: String(magazine.numero ?? ""),
        name: magazine.nombre ?? "",
        file: magazine.archivo ?? "",
        pages: magazine.paginas,
        r2Path: magazine.r2_path,
        cover: magazine.cover,
      }),
    );

    return NextResponse.json({
      success: true,
      total: magazines.length,
      magazines,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo cargar el catálogo.",
      },
      { status: 500 },
    );
  }
}