import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await prisma.supportChatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const created = await prisma.supportChatMessage.create({
    data: {
      userId: user.id,
      sender: user.role === "ADMIN" ? "ADMIN" : "USER",
      message: message.trim(),
    },
  });

  return NextResponse.json(created);
}
