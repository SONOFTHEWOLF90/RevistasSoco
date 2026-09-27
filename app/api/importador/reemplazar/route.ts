import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function runPython(args: string[]) {
  return new Promise<{ code: number; output: string }>((resolve, reject) => {
    const child = spawn("python3", args, {
      cwd: process.env.HOME || os.homedir(),
      env: process.env,
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        output,
      });
    });
  });
}

function extractNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const pdf = formData.get("pdf");
  const r2Path = String(formData.get("r2Path") || "").trim();
  const expectedPages = Number(
    String(formData.get("expectedPages") || ""),
  );

  if (!(pdf instanceof File)) {
    return NextResponse.json(
      { success: false, error: "No se recibió el PDF." },
      { status: 400 },
    );
  }

  if (!pdf.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { success: false, error: "El archivo debe ser un PDF." },
      { status: 400 },
    );
  }

  if (!r2Path) {
    return NextResponse.json(
      { success: false, error: "La revista no tiene r2Path." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(expectedPages) || expectedPages < 1) {
    return NextResponse.json(
      { success: false, error: "El número de páginas analizado no es válido." },
      { status: 400 },
    );
  }

  const scriptPath = path.join(
    os.homedir(),
    "AlpacaWork",
    "replace-magazine-generic.py",
  );

  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "hemeroteca-replace-"),
  );
  const pdfPath = path.join(tempDir, pdf.name);

  try {
    const buffer = Buffer.from(await pdf.arrayBuffer());
    await fs.writeFile(pdfPath, buffer);

    // Primera ejecución: procesa y verifica localmente.
    const prepare = await runPython([
      scriptPath,
      pdfPath,
      r2Path,
    ]);

    if (prepare.code !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Falló la preparación del reemplazo.",
          output: prepare.output,
        },
        { status: 500 },
      );
    }

    const preparedPages = extractNumber(
      prepare.output,
      /Se generaron\s+(\d+)\s+páginas/,
    );

    if (preparedPages !== null && preparedPages !== expectedPages) {
      return NextResponse.json(
        {
          success: false,
          error:
            `El PDF preparado generó ${preparedPages} páginas, ` +
            `pero el análisis indicó ${expectedPages}.`,
          output: prepare.output,
        },
        { status: 500 },
      );
    }

    // Segunda ejecución: el script crea el respaldo antes del purge
    // y luego reemplaza R2 y actualiza catalogo.json.
    const confirm = await runPython([
      scriptPath,
      pdfPath,
      r2Path,
      "--confirmar",
    ]);

    if (confirm.code !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Falló el reemplazo de la revista.",
          output: confirm.output,
        },
        { status: 500 },
      );
    }

    const pages =
      extractNumber(
        confirm.output,
        /(\d+)\s+páginas/,
      ) ?? expectedPages;

    const backupMatch = confirm.output.match(
      /✓ Respaldo:\s*(.+)/,
    );

    return NextResponse.json({
      success: true,
      pages,
      backup: backupMatch?.[1]?.trim() || null,
      output: confirm.output,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error durante el reemplazo.",
      },
      { status: 500 },
    );
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}
