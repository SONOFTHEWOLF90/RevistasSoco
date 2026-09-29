import { NextResponse } from "next/server";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

export async function GET() {
  try {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables de entorno de R2" },
        { status: 500 }
      );
    }

    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await client.send(
      new HeadBucketCommand({
        Bucket: bucket,
      })
    );

    return NextResponse.json({
      ok: true,
      message: "Vercel puede conectarse correctamente a Cloudflare R2",
      bucket,
    });
  } catch (error) {
    console.error("R2 TEST ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo conectar con R2",
      },
      { status: 500 }
    );
  }
}
