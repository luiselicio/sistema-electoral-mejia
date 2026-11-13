import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "figures:manage")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Archivo requerido." }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ ok: false, message: "Formato no permitido (JPG/PNG/WebP)." }, { status: 400 });
    }
    if (file.size > MAX) {
      return NextResponse.json({ ok: false, message: "Archivo supera 2MB." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "figures");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    const url = `/uploads/figures/${name}`;
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error al subir archivo." }, { status: 500 });
  }
}