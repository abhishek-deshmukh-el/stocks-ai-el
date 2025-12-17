import { NextResponse } from "next/server";
import { runBatchJob } from "@/lib/batch-job";

/**
 * API Route: Run Batch Job
 * POST /api/batch/run
 * 
 * Manually trigger the batch job to check all stocks in watchlist
 */
export async function POST() {
  try {
    console.log("📡 API: Manual batch job triggered");
    
    const status = await runBatchJob();
    
    return NextResponse.json({
      success: true,
      status,
      message: "Batch job completed successfully",
    });
  } catch (error) {
    console.error("API Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch/run
 * Get batch job status
 */
export async function GET() {
  return NextResponse.json({
    message: "Use POST to run batch job",
    endpoint: "/api/batch/run",
    method: "POST",
  });
}
