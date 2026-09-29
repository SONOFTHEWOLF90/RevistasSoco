import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = process.env.GITHUB_ACTIONS_TOKEN;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Falta GITHUB_ACTIONS_TOKEN" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.github.com/repos/SONOFTHEWOLF90/RevistasSoco/actions/workflows/procesar-revista.yml/dispatches",
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            pdf_r2_path: "imports-test/prueba.pdf",
            editorial: "Lana Grossa",
            collection: "Github Test",
            issue: "1",
            name: "Prueba GitHub",
            magazine_prefix: "GHTEST",
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();

      return NextResponse.json(
        {
          ok: false,
          status: response.status,
          error: body,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "GitHub Actions recibió la orden correctamente",
    });
  } catch (error) {
    console.error("GITHUB TEST ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo conectar con GitHub Actions",
      },
      { status: 500 }
    );
  }
}
