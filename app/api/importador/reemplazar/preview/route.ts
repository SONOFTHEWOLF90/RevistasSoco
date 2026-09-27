import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  let tempFile = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "No se recibió ningún PDF.",
        },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        {
          success: false,
          error: "El archivo debe ser un PDF.",
        },
        { status: 400 },
      );
    }

    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "hemeroteca-preview-"),
    );

    tempFile = path.join(tempDir, "revista.pdf");

    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(tempFile, buffer);

    const { stdout } = await execFileAsync("/opt/homebrew/bin/pdfinfo", [
      tempFile,
    ]);

    const match = stdout.match(/^Pages:\s+(\d+)/m);

    if (!match) {
      throw new Error("No se pudo determinar el número de páginas del PDF.");
    }

    const pages = Number(match[1]);

    return NextResponse.json({
      success: true,
      filename: file.name,
      size: file.size,
      pages,
    });
  } catch (error) {
    console.error("Error al analizar PDF:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo analizar el PDF.",
      },
      { status: 500 },
    );
  } finally {
    if (tempFile) {
      try {
        await fs.rm(path.dirname(tempFile), {
          recursive: true,
          force: true,
        });
      } catch {}
    }
  }
}