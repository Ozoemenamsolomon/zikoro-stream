import { TOrganization } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createClient()

  if (req.method === "GET") {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      // Get all workspace aliases for the user
      const { data, error } = await supabase
        .from("organizationTeamMembers")
        .select("*, organization(*)")
        .eq("userId", id);

      if (error) throw error;

      let result = [] as TOrganization[];
      if (Array.isArray(data) && data.length > 0) {
        result = data?.map((datum) => {
          const { organization, created_at, ...restData } = datum;
          return {
            ...organization,
            organizationTeamMembers: [
              {
                ...restData,
              },
            ],
          };
        });
      }

      if (error) throw error;

      return NextResponse.json(
        {
          data: result,
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
