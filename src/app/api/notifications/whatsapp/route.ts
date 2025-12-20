import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const { message, phoneNumber } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const success = await sendWhatsApp({
      to: phoneNumber,
      message,
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: "WhatsApp notification sent successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to send WhatsApp notification" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("WhatsApp notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
