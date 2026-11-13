import { NextResponse } from "next/server";
import { startParticipation } from "@/modules/participation/service";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`participation:${ip}`, 10, 10 * 60 * 1000); // 10 intentos / 10 min por IP (A1)
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED", message: "Demasiados intentos. Intente más tarde." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }
    const body = await req.json();
    const { surveyId, cedula } = body ?? {};

    if (!surveyId || typeof surveyId !== "string" || !cedula || typeof cedula !== "string") {
      return NextResponse.json(
        { ok: false, code: "BAD_REQUEST", message: "surveyId y cedula son requeridos." },
        { status: 400 },
      );
    }

    const result = await startParticipation({ surveyId, cedula });
    if (!result.ok) {
      const status =
        result.code === "INVALID_CEDULA" ? 400 :
        result.code === "SURVEY_NOT_FOUND" ? 404 :
        result.code === "DUPLICATE" ? 409 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("participation start error", e);
    return NextResponse.json(
      { ok: false, code: "ERROR", message: "Error interno." },
      { status: 500 },
    );
  }
}