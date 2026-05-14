import { NextResponse } from "next/server";
import { parseWithReducto } from "@/lib/reducto";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const parsed = await parseWithReducto(file);
  return NextResponse.json(parsed);
}
