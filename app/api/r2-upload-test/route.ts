import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

    const key = `imports-test/vercel-${Date.now()}.pdf`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: "application/pdf",
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 600,
    });

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
    });
  } catch (error) {
    console.error("R2 UPLOAD TEST ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo generar la URL de subida",
      },
      { status: 500 }
    );
  }
}
