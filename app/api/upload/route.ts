import { NextResponse } from "next/server";

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel"
]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 12MB" }, { status: 413 });
  }

  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json({
    id: crypto.randomUUID(),
    fileName: file.name,
    size: file.size,
    type: file.type,
    storage: configured ? "supabase-ready" : "demo-memory",
    fileUrl: configured ? null : `demo://${encodeURIComponent(file.name)}`
  });
}
