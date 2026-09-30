import { NextResponse } from "next/server";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET!;

const GITHUB_TOKEN = process.env.GITHUB_ACTIONS_TOKEN;

const GITHUB_WORKFLOW =
  "https://api.github.com/repos/SONOFTHEWOLF90/RevistasSoco/actions/workflows/eliminar-revista.yml/dispatches";

export async function POST(request: Request) {
  try {
    if (
      !process.env.R2_ENDPOINT ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Faltan las variables de conexión con Cloudflare R2.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta el id de la revista.",
        },
        { status: 400 },
      );
    }

    const catalogPath = path.join(process.cwd(), "catalogo.json");

    const catalogRaw = await fs.readFile(catalogPath, "utf8");
    const catalog = JSON.parse(catalogRaw);

    if (!Array.isArray(catalog)) {
      return NextResponse.json(
        {
          success: false,
          error: "catalogo.json no contiene una lista válida.",
        },
        { status: 500 },
      );
    }

    const index = Number(id.split("|").pop());

    if (!Number.isInteger(index) || index < 0 || index >= catalog.length) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró la revista seleccionada.",
        },
        { status: 404 },
      );
    }

    const magazine = catalog[index];

    if (!magazine) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró la revista seleccionada.",
        },
        { status: 404 },
      );
    }

    const r2Path = String(magazine.r2_path || "").trim();

    if (!r2Path) {
      return NextResponse.json(
        {
          success: false,
          error: "La revista no tiene una ruta R2.",
        },
        { status: 400 },
      );
    }

    const objects: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await r2.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: `${r2Path}/`,
          ContinuationToken: continuationToken,
        }),
      );

      for (const object of response.Contents || []) {
        if (object.Key) {
          objects.push(object.Key);
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    for (let i = 0; i < objects.length; i += 1000) {
      const batch = objects.slice(i, i + 1000);

      await r2.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: {
            Objects: batch.map((Key) => ({ Key })),
          },
        }),
      );
    }

        if (!GITHUB_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La revista fue eliminada de R2, pero falta GITHUB_ACTIONS_TOKEN para actualizar el catálogo.",
        },
        { status: 500 },
      );
    }

    const githubResponse = await fetch(
      GITHUB_WORKFLOW,
      {
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
          },
        }),
      },
    );

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();

      console.error(
        "Error GitHub Actions:",
        errorText,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "La revista fue eliminada de R2, pero no se pudo iniciar la actualización del catálogo.",
          r2Path,
        },
        { status: 500 },
      );
    }

       return NextResponse.json({
      success: true,
      deletedR2Objects: objects.length,
      r2Path,
      catalogUpdate: "queued",
      magazine: {
        editorial: magazine.editorial,
        collection: magazine.coleccion,
        issue: magazine.numero,
        name: magazine.nombre,
      },
    });
  } catch (error) {
    console.error("Error eliminando revista:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error durante la eliminación.",
      },
      { status: 500 },
    );
  }
}