import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";



export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  const { streamId } = await params;
  const supabase = createClient()

  if (req.method === "GET") {
    try {
      const { data, error, status } = await supabase
        .from("stream")
        .select("*")
        .eq("streamAlias", streamId)
        .maybeSingle();

      if (error) throw error;

      return NextResponse.json(
        {
          data,
        },
        {
          status: 200,
        }
      );
    } catch (error) {
      console.error(error);
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
    return NextResponse.json({ error: "Method not allowed" });
  }
}

export const dynamic = "force-dynamic";
