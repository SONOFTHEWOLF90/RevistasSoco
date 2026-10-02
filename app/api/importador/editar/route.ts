
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const GITHUB_TOKEN = process.env.GITHUB_ACTIONS_TOKEN;

const GITHUB_WORKFLOW =
  "https://api.github.com/repos/SONOFTHEWOLF90/RevistasSoco/actions/workflows/editar-revista.yml/dispatches";

type CatalogMagazine = {
  editorial?: string;
  coleccion?: string;
  numero?: string | number;
  nombre?: string;
  archivo?: string;
  ruta?: string;
  paginas?: number;
  r2_path?: string;
  cover?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { id, editorial, collection, issue, name } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "No se recibió el identificador de la revista." },
        { status: 400 },
      );
    }

    if (!editorial?.trim() || !collection?.trim() || !issue?.trim() || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Todos los campos son obligatorios." },
        { status: 400 },
      );
    }

    const parts = String(id).split("|");
    const index = Number(parts[parts.length - 1]);

    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json(
        { success: false, error: "Identificador de revista inválido." },
        { status: 400 },
      );
    }

    const catalogPath = path.join(process.cwd(), "catalogo.json");
    const catalogRaw = await fs.readFile(catalogPath, "utf8");
    const catalog = JSON.parse(catalogRaw) as CatalogMagazine[];

    const magazine = catalog[index];

    if (!magazine) {
      return NextResponse.json(
        { success: false, error: "No se encontró la revista en el catálogo." },
        { status: 404 },
      );
    }

    const r2Path = String(magazine.r2_path || "").trim();

    if (!r2Path) {
      return NextResponse.json(
        { success: false, error: "La revista no tiene una ruta R2 válida." },
        { status: 400 },
      );
    }

    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Falta configurar GITHUB_ACTIONS_TOKEN." },
        { status: 500 },
      );
    }

    const githubResponse = await fetch(GITHUB_WORKFLOW, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          r2_path: r2Path,
          editorial: editorial.trim(),
          collection: collection.trim(),
          issue: String(issue).trim(),
          name: name.trim(),
        },
      }),
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error("Error GitHub Actions:", errorText);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo iniciar la actualización del catálogo.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Actualización enviada. El catálogo se actualizará en unos momentos.",
        magazine: {
          id: String(id),
          editorial: editorial.trim(),
          collection: collection.trim(),
          issue: String(issue).trim(),
          name: name.trim(),
          file: magazine.archivo ?? "",
          pages: magazine.paginas,
          r2Path,
          cover: magazine.cover,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Error editando revista:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo iniciar la actualización de la revista.",
      },
      { status: 500 },
    );
  }
}
