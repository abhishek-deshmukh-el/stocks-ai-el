/**
 * Login API Route
 * Handles user authentication and persists to MongoDB
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phoneNumber } = body;

    // Validate required fields
    if (!name || !phoneNumber) {
      return NextResponse.json({ error: "Name and phone number are required" }, { status: 400 });
    }

    // Basic phone validation
    const phoneRegex = /^\+?[\d\s\-()]{10,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Please enter a valid phone number (10-15 digits)" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Check if user exists
    let user = await User.findOne({ phoneNumber: phoneNumber.trim() });

    if (user) {
      user.name = name.trim(); // Update name if changed
      await user.save();

      return NextResponse.json(
        {
          success: true,
          message: "Login successful",
          user: {
            id: user._id.toString(),
            name: user.name,
            phoneNumber: user.phoneNumber,
            usStocks: user.usStocks || [],
            indiaStocks: user.indiaStocks || [],
          },
        },
        { status: 200 }
      );
    } else {
      // Create new user
      user = await User.create({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      return NextResponse.json(
        {
          success: true,
          message: "Account created successfully",
          user: {
            id: user._id.toString(),
            name: user.name,
            phoneNumber: user.phoneNumber,
            usStocks: user.usStocks || [],
            indiaStocks: user.indiaStocks || [],
          },
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error("Login error:", error);

    // Handle duplicate phone number error
    if (error.code === 11000) {
      return NextResponse.json({ error: "Phone number already registered" }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumber = searchParams.get("phoneNumber");

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ phoneNumber: phoneNumber.trim() });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          phoneNumber: user.phoneNumber,
          usStocks: user.usStocks || [],
          indiaStocks: user.indiaStocks || [],
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
