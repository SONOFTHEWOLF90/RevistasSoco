import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export const runtime = "nodejs";

const IMPORT_SCRIPT =
  "/Users/superate/AlpacaWork/import-magazine-local.py";

const TEMP_ROOT = path.join(
  os.homedir(),
  "AlpacaWork",
  "import-temp-upload",
);

function createMagazinePrefix(
  editorial: string,
  collection: string,
  issue: string,
  file: string,
) {
  const filename = path.basename(file, path.extname(file));

  if (
    editorial.trim().toLowerCase() === "lang yarns" &&
    collection.trim().toLowerCase() === "fam"
  ) {
    return `FAM-${issue.trim()}`;
  }

  if (
    editorial.trim().toLowerCase() === "lana grossa" &&
    collection.trim().toLowerCase() === "all seasons"
  ) {
    return `AS.${issue.trim().padStart(2, "0")}`;
  }

  return filename.replace(/-00$/i, "").trim();
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "")
    .slice(0, 180);
}

function runPython(args: string[]) {
  return new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolve) => {
    const python = spawn("python3", [IMPORT_SCRIPT, ...args], {
      cwd: "/Users/superate/AlpacaWork",
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      const text = data.toString();

      stdout += text;

      console.log("[IMPORTADOR]", text);
    });

    python.stderr.on("data", (data) => {
      const text = data.toString();

      stderr += text;

      console.error("[IMPORTADOR ERROR]", text);
    });

    python.on("close", (code) => {
      resolve({
        code,
        stdout,
        stderr,
      });
    });
  });
}

export async function POST(request: Request) {
  let temporaryPdf = "";

  try {
    const formData = await request.formData();

    const pdf = formData.get("pdf");
    const editorial = String(formData.get("editorial") || "").trim();
    const collection = String(formData.get("collection") || "").trim();
    const issue = String(formData.get("issue") || "").trim();
    const name = String(formData.get("name") || "").trim();

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
    // DIRECTORIO TEMPORAL
    // --------------------------------------------------------

    await fs.mkdir(TEMP_ROOT, {
      recursive: true,
    });

    const safeFilename = sanitizeFilename(pdf.name);

    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeFilename}`;

    temporaryPdf = path.join(TEMP_ROOT, uniqueName);

    // --------------------------------------------------------
    // GUARDAR PDF TEMPORAL
    // --------------------------------------------------------

    const arrayBuffer = await pdf.arrayBuffer();

    await fs.writeFile(
      temporaryPdf,
      Buffer.from(arrayBuffer),
    );

    console.log("");
    console.log("========================================");
    console.log("IMPORTACIÓN LOCAL");
    console.log("========================================");
    console.log("PDF:", temporaryPdf);
    console.log("Editorial:", editorial);
    console.log("Colección:", collection);
    console.log("Número:", issue);
    console.log("Nombre:", name);

    // --------------------------------------------------------
    // PREFIJO
    // --------------------------------------------------------

    const magazinePrefix = createMagazinePrefix(
      editorial,
      collection,
      issue,
      pdf.name,
    );

    console.log("Prefijo:", magazinePrefix);

    // --------------------------------------------------------
    // EJECUTAR PYTHON
    // --------------------------------------------------------

    const result = await runPython([
      temporaryPdf,
      editorial,
      collection,
      issue,
      name,
      magazinePrefix,
    ]);

    if (result.code !== 0) {
      console.error(result.stderr);

      return NextResponse.json(
        {
          success: false,
          error:
            result.stderr.trim() ||
            result.stdout.trim() ||
            "El procesador terminó con un error.",
          output: result.stdout,
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------------
    // INTENTAR EXTRAER INFORMACIÓN DEL RESULTADO
    // --------------------------------------------------------

    const r2Match = result.stdout.match(
      /R2:\s+(.+)/,
    );

    const pagesMatch = result.stdout.match(
      /Páginas:\s+(\d+)/,
    );

    const r2Path = r2Match?.[1]?.trim() || "";

    const pages = pagesMatch
      ? Number(pagesMatch[1])
      : 0;

    return NextResponse.json({
      success: true,
      output: result.stdout,
      magazine: {
        editorial,
        collection,
        issue,
        name,
        pages,
        r2Path,
      },
    });
  } catch (error) {
    console.error(error);

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
  } finally {
    // --------------------------------------------------------
    // ELIMINAR PDF TEMPORAL
    // --------------------------------------------------------

    if (temporaryPdf) {
      try {
        await fs.unlink(temporaryPdf);

        console.log(
          "PDF temporal eliminado:",
          temporaryPdf,
        );
      } catch {
        // No interrumpimos la respuesta si el temporal
        // ya no existe o no puede eliminarse.
      }
    }
  }
}