import { NextRequest, NextResponse } from "next/server";
import { stockOrchestrator } from "@/lib/services/stock-orchestrator.service";
import { analyzeDMAAkshat, DMADataAkshat } from "@/lib/dmaAkshat";
import { Region } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface DMARequest {
  symbol: string;
  region: Region;
}

interface DMABatchRequest {
  stocks: DMARequest[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get("symbols");
    const regionParam = searchParams.get("region") || Region.US;

    if (!symbolsParam) {
      return NextResponse.json(
        { success: false, error: "Missing symbols parameter" },
        { status: 400 }
      );
    }

    const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());
    const stocks = symbols.map((symbol) => ({
      symbol,
      region: regionParam as Region,
    }));

    const results = await Promise.allSettled(
      stocks.map(async (stock) => {
        try {
          // Fetch 250 days of historical data to ensure we have enough for 200 DMA
          const historicalData = await stockOrchestrator.fetchHistoricalData(
            stock.symbol,
            250,
            stock.region
          );

          if (historicalData.length < 170) {
            throw new Error(
              "Insufficient historical data for DMA calculation (minimum 170 days required)"
            );
          }

          // Convert to DMAData format
          let dmaData: DMADataAkshat[] = historicalData.map((d) => ({
            date: d.date,
            close: d.close,
          }));

          // If data is between 170-199 days, pad with average to reach 200
          if (dmaData.length < 200) {
            const avgClose = dmaData.reduce((sum, d) => sum + d.close, 0) / dmaData.length;
            const daysToAdd = 200 - dmaData.length;

            // Create padding data with average price
            const paddingData: DMADataAkshat[] = [];
            const oldestDate = new Date(dmaData[0].date);

            for (let i = 0; i < daysToAdd; i++) {
              const paddedDate = new Date(oldestDate);
              paddedDate.setDate(paddedDate.getDate() - (daysToAdd - i));
              paddingData.push({
                date: paddedDate.toISOString().split("T")[0],
                close: avgClose,
              });
            }

            // Prepend padding data to actual data
            dmaData = [...paddingData, ...dmaData];
          }

          // Analyze DMA
          const analysis = analyzeDMAAkshat(dmaData);

          if (!analysis) {
            throw new Error("DMA analysis failed");
          }

          return {
            success: true,
            symbol: stock.symbol,
            data: analysis,
            calculatedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Error processing ${stock.symbol}:`, error);
          return {
            success: false,
            symbol: stock.symbol,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const successfulResults = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    const totalSuccessful = successfulResults.filter((r) => r.success).length;
    const totalProcessed = stocks.length;

    return NextResponse.json({
      success: true,
      results: successfulResults,
      totalProcessed,
      totalSuccessful,
      totalFailed: totalProcessed - totalSuccessful,
    });
  } catch (error) {
    console.error("Error in DMA batch GET endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: DMABatchRequest = await req.json();

    if (!body.stocks || !Array.isArray(body.stocks)) {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const results = await Promise.allSettled(
      body.stocks.map(async (stock) => {
        try {
          // Fetch 250 days of historical data to ensure we have enough for 200 DMA
          const historicalData = await stockOrchestrator.fetchHistoricalData(
            stock.symbol,
            250,
            stock.region
          );

          if (historicalData.length < 170) {
            throw new Error(
              "Insufficient historical data for DMA calculation (minimum 170 days required)"
            );
          }

          // Convert to DMAData format
          let dmaData: DMADataAkshat[] = historicalData.map((d) => ({
            date: d.date,
            close: d.close,
          }));

          // If data is between 170-199 days, pad with average to reach 200
          if (dmaData.length < 200) {
            const avgClose = dmaData.reduce((sum, d) => sum + d.close, 0) / dmaData.length;
            const daysToAdd = 200 - dmaData.length;

            // Create padding data with average price
            const paddingData: DMADataAkshat[] = [];
            const oldestDate = new Date(dmaData[0].date);

            for (let i = 0; i < daysToAdd; i++) {
              const paddedDate = new Date(oldestDate);
              paddedDate.setDate(paddedDate.getDate() - (daysToAdd - i));
              paddingData.push({
                date: paddedDate.toISOString().split("T")[0],
                close: avgClose,
              });
            }

            // Prepend padding data to actual data
            dmaData = [...paddingData, ...dmaData];
          }

          // Analyze DMA
          const analysis = analyzeDMAAkshat(dmaData);

          if (!analysis) {
            throw new Error("DMA analysis failed");
          }

          return {
            success: true,
            symbol: stock.symbol,
            analysis,
            calculatedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Error processing ${stock.symbol}:`, error);
          return {
            success: false,
            symbol: stock.symbol,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const successfulResults = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    const totalSuccessful = successfulResults.filter((r) => r.success).length;
    const totalProcessed = body.stocks.length;

    return NextResponse.json({
      success: true,
      results: successfulResults,
      totalProcessed,
      totalSuccessful,
      totalFailed: totalProcessed - totalSuccessful,
    });
  } catch (error) {
    console.error("Error in DMA batch endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
