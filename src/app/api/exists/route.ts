import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (req.method === "POST") {
    try {
      const { email } = await req.json();
      const response = await fetch(
        "https://ddlepujpbqjoogkmiwfu.supabase.co/functions/v1/check-if-user-exist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const result = await response.json();

      // success - Looks Good
      return NextResponse.json(
        { data: result },
        {
          status: 200,
        }
      );
    } catch (error) {
      // intentionally return 500
      return NextResponse.json(
        {
          error: "An error occurred while making the request.",
        },
        {
          status: 500,
        }
      );
    }
  } else {
    // return error response
    return NextResponse.json({ error: "Method not allowed" });
  }
}

export const dynamic = "force-dynamic";
