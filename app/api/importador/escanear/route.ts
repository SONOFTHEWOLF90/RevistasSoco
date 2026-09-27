import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

import catalogData from "../../../../catalogo.json";

const ICLOUD_ROOT =
  "/Users/superate/Library/Mobile Documents/com~apple~CloudDocs/Projekt Peru/5 CATALOG DES MODELOS";

type CatalogMagazine = {
  estado?: string;
  editorial: string;
  coleccion: string;
  numero: string;
  nombre: string;
  archivo: string;
  ruta: string;
  paginas?: number;
  r2_path?: string;
  prefix?: string;
  cover?: string;
};

type ScanResult = {
  editorial: string;
  collection: string;
  issue: string;
  name: string;
  file: string;
  relativePath: string;
  status: "imported" | "pending";
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizePath(value: string) {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

async function findMagazineFiles(
  directory: string,
): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      files.push(
        ...(await findMagazineFiles(fullPath)),
      );

      continue;
    }

    /*
     * IMPORTANTE:
     *
     * Solo consideramos revistas cuyo archivo
     * termina exactamente en -00.pdf
     *
     * Los -01.pdf, -02.pdf, etc. se ignoran.
     */
    if (
      entry.isFile() &&
      entry.name
        .toLowerCase()
        .endsWith("-00.pdf")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseMagazinePath(
  fullPath: string,
): ScanResult {
  const relativePath = normalizePath(
    path.relative(
      ICLOUD_ROOT,
      fullPath,
    ),
  );

  const parts = relativePath.split("/");

  const file = parts.at(-1) ?? "";

  const folders = parts.slice(0, -1);

  /*
   * ESTRUCTURA:
   *
   * Editorial/
   *   Colección/
   *     Número Nombre/
   *       revista-00.pdf
   */

  const editorial = folders[0] ?? "";

  let collection = folders[1] ?? "";

  let issue = "";

  let name = "";

  /*
   * CASO NORMAL:
   *
   * Lang Yarns/
   *   FaM/
   *     280 Collektion/
   *       280-00.pdf
   *
   * Resultado:
   *
   * Editorial: Lang Yarns
   * Colección: FaM
   * Nº: 280
   * Nombre: Collektion
   */

  if (folders.length >= 3) {
    const issueFolder = folders[2];

    /*
     * 1. CARPETA QUE EMPIEZA POR NÚMERO
     *
     * 280 Collektion
     * 252 Casual
     * 1
     * 2020-01
     */

    const numericMatch =
      issueFolder.match(
        /^(\d+)(?:\s+(.*))?$/,
      );

    if (numericMatch) {
      issue = numericMatch[1];

      const description =
        numericMatch[2]?.trim();

      name =
        description || issueFolder;
    } else {
      /*
       * 2. CASOS COMO:
       *
       * Cloud
       * Maschenwelt
       * Beloved Knits
       */

      name = issueFolder;
    }

    /*
     * CASOS ESPECIALES:
     *
     * 2019-HW
     * 2020-01
     * 2020-02
     *
     * Estas carpetas tienen información
     * de número aunque no coincidan con
     * /^(\d+)...$/
     */

    if (!issue) {
      const yearIssueMatch =
        issueFolder.match(
          /^(\d{4})-(.+)$/,
        );

      if (yearIssueMatch) {
        /*
         * Para 2019-HW:
         *
         * Nº = 2019-HW
         * Nombre = 2019-HW
         *
         * No inventamos que el número sea 19.
         */

        issue = issueFolder;

        name = issueFolder;
      }
    }
  }

  /*
   * CASO SIN TERCERA CARPETA
   *
   * Ejemplo:
   *
   * Editorial/
   *   2020-01/
   *     revista-00.pdf
   */

  if (!issue && folders.length >= 2) {
    const collectionFolder =
      folders[1];

    const collectionMatch =
      collectionFolder.match(
        /^(\d{4})-(\d{2})$/,
      );

    if (collectionMatch) {
      /*
       * 2020-01
       *
       * Colección = 2020
       * Nº = 01
       * Nombre = 2020-01
       */

      collection =
        collectionMatch[1];

      issue =
        collectionMatch[2];

      name =
        collectionFolder;
    }
  }

  /*
   * ÚLTIMO RECURSO
   *
   * Si todavía no tenemos número,
   * usamos el nombre de la carpeta.
   *
   * Así nunca enviamos issue vacío
   * al importador.
   */

  if (!issue) {
    if (folders.length >= 3) {
      issue = folders[2];
      name = name || folders[2];
    } else if (folders.length >= 2) {
      issue = folders[1];
      name = name || folders[1];
    } else {
      /*
       * Situación excepcional:
       * usamos el nombre del PDF.
       */

      issue = path.basename(
        file,
        ".pdf",
      );

      name = issue;
    }
  }

  return {
    editorial,
    collection,
    issue,
    name:
      name ||
      path.basename(file, ".pdf"),
    file,
    relativePath,
    status: "pending",
  };
}

function findCatalogMagazine(
  scanned: ScanResult,
  catalog: CatalogMagazine[],
) {
  /*
   * PRIMERA OPCIÓN:
   *
   * Coincidencia exacta por ruta original.
   *
   * Es la más segura.
   */

  const exact = catalog.find(
    (magazine) =>
      normalizePath(
        magazine.ruta,
      ) ===
      normalizePath(
        scanned.relativePath,
      ),
  );

  if (exact) {
    return exact;
  }

  /*
   * SEGUNDA OPCIÓN:
   *
   * Editorial + archivo.
   */

  return catalog.find(
    (magazine) =>
      normalize(
        magazine.editorial,
      ) ===
        normalize(
          scanned.editorial,
        ) &&
      normalize(
        magazine.archivo,
      ) ===
        normalize(
          scanned.file,
        ),
  );
}

export async function GET() {
  try {
    /*
     * Buscar únicamente:
     *
     * *-00.pdf
     */

    const files =
      await findMagazineFiles(
        ICLOUD_ROOT,
      );

    const catalog =
      catalogData as CatalogMagazine[];

    const results: ScanResult[] =
      files.map((file) => {
        const scanned =
          parseMagazinePath(file);

        const catalogMagazine =
          findCatalogMagazine(
            scanned,
            catalog,
          );

        /*
         * Si ya está en catalogo.json
         * y tiene r2_path,
         * consideramos que ya fue importada.
         */

        if (
          catalogMagazine?.r2_path
        ) {
          return {
            ...scanned,

            editorial:
              catalogMagazine.editorial,

            collection:
              catalogMagazine.coleccion,

            issue:
              catalogMagazine.numero,

            name:
              catalogMagazine.nombre,

            status: "imported",
          };
        }

        /*
         * Si todavía no está importada,
         * usamos la información de las carpetas.
         */

        return scanned;
      });

    /*
     * Ordenar por:
     *
     * Editorial
     * Colección
     * Número
     * Archivo
     */

    results.sort((a, b) =>
      `${a.editorial}/${a.collection}/${a.issue}/${a.file}`.localeCompare(
        `${b.editorial}/${b.collection}/${b.issue}/${b.file}`,
        undefined,
        {
          numeric: true,
        },
      ),
    );

    return NextResponse.json({
      success: true,

      total: results.length,

      imported: results.filter(
        (magazine) =>
          magazine.status ===
          "imported",
      ).length,

      pending: results.filter(
        (magazine) =>
          magazine.status ===
          "pending",
      ).length,

      errors: 0,

      magazines: results,
    });
  } catch (error) {
    console.error(
      "ERROR ESCANEANDO HEMEROTECA:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al escanear.",
      },
      {
        status: 500,
      },
    );
  }
}