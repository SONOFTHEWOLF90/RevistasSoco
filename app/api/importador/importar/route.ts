import { NextResponse } from "next/server";
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
const GITHUB_TOKEN = process.env.GITHUB_ACTIONS_TOKEN!;

const GITHUB_WORKFLOW =
  "https://api.github.com/repos/SONOFTHEWOLF90/RevistasSoco/actions/workflows/procesar-revista.yml/dispatches";

function sanitizeFilename(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "")
    .slice(0, 180);
}

export async function POST(request: Request) {
  try {
    // --------------------------------------------------------
    // VALIDAR VARIABLES DE ENTORNO
    // --------------------------------------------------------

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

    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta GITHUB_ACTIONS_TOKEN.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------------
    // LEER FORMULARIO
    // --------------------------------------------------------

    const formData = await request.formData();

    const pdf = formData.get("pdf");
    const editorial = String(
      formData.get("editorial") || "",
    ).trim();
    const collection = String(
      formData.get("collection") || "",
    ).trim();
    const issue = String(
      formData.get("issue") || "",
    ).trim();
    const name = String(
      formData.get("name") || "",
    ).trim();

    // --------------------------------------------------------
    // VALIDACIÓN
    // --------------------------------------------------------

    if (!(pdf instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "No se recibió ningún PDF.",
        },
        { status: 400 },
      );
    }

    if (!pdf.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        {
          success: false,
          error: "El archivo debe tener extensión .pdf.",
        },
        { status: 400 },
      );
    }

    if (!editorial) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta la editorial.",
        },
        { status: 400 },
      );
    }

    if (!collection) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta la colección.",
        },
        { status: 400 },
      );
    }

    if (!issue) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta el número.",
        },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta el nombre de la revista.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------------
    // NOMBRE TEMPORAL DEL PDF EN R2
    // --------------------------------------------------------

    const safeFilename = sanitizeFilename(pdf.name);

    const pdfR2Path =
      `imports/${Date.now()}-${crypto.randomUUID()}-${safeFilename}`;

    console.log("");
    console.log("========================================");
    console.log("IMPORTADOR REMOTO");
    console.log("========================================");
    console.log("PDF:", pdf.name);
    console.log("R2 temporal:", pdfR2Path);
    console.log("Editorial:", editorial);
    console.log("Colección:", collection);
    console.log("Número:", issue);
    console.log("Nombre:", name);

    // --------------------------------------------------------
    // GENERAR URL FIRMADA PARA SUBIR EL PDF
    // --------------------------------------------------------

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: pdfR2Path,
      ContentType: "application/pdf",
    });

    const uploadUrl = await getSignedUrl(
      r2,
      command,
      {
        expiresIn: 600,
      },
    );

    // --------------------------------------------------------
    // SUBIR PDF A R2
    // --------------------------------------------------------

    const pdfBuffer = Buffer.from(
      await pdf.arrayBuffer(),
    );

    const uploadResponse = await fetch(
      uploadUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: pdfBuffer,
      },
    );

    if (!uploadResponse.ok) {
      const errorText =
        await uploadResponse.text();

      console.error(
        "Error subiendo PDF a R2:",
        errorText,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "No se pudo subir el PDF a Cloudflare R2.",
        },
        { status: 500 },
      );
    }

    console.log(
      "PDF subido correctamente a R2.",
    );

    // --------------------------------------------------------
    // LANZAR GITHUB ACTIONS
    // --------------------------------------------------------

    const githubResponse = await fetch(
      GITHUB_WORKFLOW,
      {
        method: "POST",
        headers: {
          Accept:
            "application/vnd.github+json",
          Authorization:
            `Bearer ${GITHUB_TOKEN}`,
          "X-GitHub-Api-Version":
            "2022-11-28",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            pdf_r2_path: pdfR2Path,
            pdf_filename: pdf.name,
            editorial,
            collection,
            issue,
            name,
          },
        }),
      },
    );

    if (!githubResponse.ok) {
      const errorText =
        await githubResponse.text();

      console.error(
        "Error GitHub Actions:",
        errorText,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "El PDF se subió a R2, pero no se pudo iniciar el procesamiento.",
          pdfR2Path,
        },
        { status: 500 },
      );
    }

    console.log(
      "GitHub Actions recibió la orden.",
    );

    // --------------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------------

    return NextResponse.json({
      success: true,
      status: "queued",
      message:
        "La revista fue enviada correctamente al procesamiento remoto.",
      output:
        "PDF subido a R2 y GitHub Actions iniciado.",
      magazine: {
        editorial,
        collection,
        issue,
        name,
        file: pdf.name,
        pdfR2Path,
      },
    });
  } catch (error) {
    console.error(
      "Error en importador remoto:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado durante la importación.",
      },
      { status: 500 },
    );
  }
}