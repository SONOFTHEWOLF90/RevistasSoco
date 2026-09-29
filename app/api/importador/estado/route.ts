import { NextResponse } from "next/server";
import {
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const importId = url.searchParams.get("importId");

    if (!importId) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta importId.",
        },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9-]+$/.test(importId)) {
      return NextResponse.json(
        {
          success: false,
          error: "importId inválido.",
        },
        { status: 400 },
      );
    }

    const key = `imports/status/${importId}.json`;

    const response = await r2.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error("El estado no contiene datos.");
    }

    const body = await response.Body.transformToString();
    const status = JSON.parse(body);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error(
      "Error consultando estado de importación:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo consultar el estado de la importación.",
      },
      { status: 500 },
    );
  }
}