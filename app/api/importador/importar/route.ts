
import { NextResponse } from "next/server";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

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
  "https://api.github.com/repos/SONOFTHEWOLF90/RevistasSoco/actions/workflows/procesar-revista.yml/dispatches";

function sanitizeFilename(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "")
    .slice(0, 180);
}

function hasR2Config() {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET
  );
}

export async function POST(request: Request) {
  try {
    if (!hasR2Config()) {
      return NextResponse.json(
        {
          success: false,
          error: "Faltan las variables de conexión con Cloudflare R2.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    // PASO 1: Preparar subida directa a R2
    if (body.action === "prepare") {
      const filename = String(body.filename || "").trim();
      const editorial = String(body.editorial || "").trim();
      const collection = String(body.collection || "").trim();
      const issue = String(body.issue || "").trim();
      const name = String(body.name || "").trim();

      if (
        !filename.toLowerCase().endsWith(".pdf") ||
        !editorial ||
        !collection ||
        !issue ||
        !name
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Faltan datos o el archivo no es un PDF válido.",
          },
          { status: 400 }
        );
      }

      const safeFilename = sanitizeFilename(filename);

      if (!safeFilename) {
        return NextResponse.json(
          {
            success: false,
            error: "El nombre del archivo PDF no es válido.",
          },
          { status: 400 }
        );
      }

      const importId = randomUUID();
      const pdfR2Path = `imports/${importId}-${safeFilename}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: pdfR2Path,
        ContentType: "application/pdf",
      });

      const uploadUrl = await getSignedUrl(r2, command, {
        expiresIn: 600,
      });

      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: `imports/status/${importId}.json`,
          Body: JSON.stringify({
            status: "queued",
            importId,
          }),
          ContentType: "application/json",
        })
      );

      return NextResponse.json({
        success: true,
        uploadUrl,
        pdfR2Path,
        importId,
      });
    }

    // PASO 2: Confirmar subida e iniciar GitHub Actions
    if (body.action === "complete") {
      if (!GITHUB_TOKEN) {
        return NextResponse.json(
          {
            success: false,
            error: "Falta GITHUB_ACTIONS_TOKEN.",
          },
          { status: 500 }
        );
      }

      const filename = String(body.filename || "").trim();
      const editorial = String(body.editorial || "").trim();
      const collection = String(body.collection || "").trim();
      const issue = String(body.issue || "").trim();
      const name = String(body.name || "").trim();
      const pdfR2Path = String(body.pdfR2Path || "");
      const importId = String(body.importId || "");

      // Validar los datos antes de consultar R2
      if (
        !filename.toLowerCase().endsWith(".pdf") ||
        !editorial ||
        !collection ||
        !issue ||
        !name ||
        !/^[0-9a-f-]{36}$/i.test(importId) ||
        !pdfR2Path.startsWith(`imports/${importId}-`)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Faltan datos o la ruta del PDF no es válida.",
          },
          { status: 400 }
        );
      }

      // Comprobar que el PDF realmente llegó a R2
      try {
        await r2.send(
          new HeadObjectCommand({
            Bucket: BUCKET,
            Key: pdfR2Path,
          })
        );
      } catch (error) {
        console.error("PDF no encontrado en R2:", error);

        return NextResponse.json(
          {
            success: false,
            error:
              "No se encontró el PDF en R2. Verifica que la subida haya terminado.",
          },
          { status: 400 }
        );
      }

      // Iniciar GitHub Actions
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
            pdf_r2_path: pdfR2Path,
            pdf_filename: filename,
            editorial,
            collection,
            issue,
            name,
            import_id: importId,
          },
        }),
      });

      if (!githubResponse.ok) {
        const errorText = await githubResponse.text();
        console.error("Error GitHub Actions:", errorText);

        return NextResponse.json(
          {
            success: false,
            error:
              "El PDF se subió a R2, pero no se pudo iniciar el procesamiento.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        status: "queued",
        importId,
        message:
          "La revista fue enviada correctamente al procesamiento remoto.",
        output: "PDF subido directamente a R2 y GitHub Actions iniciado.",
        magazine: {
          editorial,
          collection,
          issue,
          name,
          pages: 0,
          r2Path: "",
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Acción no válida.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en importador remoto:", error);
   
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado durante la importación.",
      },
      { status: 500 }
    );
  }
}
