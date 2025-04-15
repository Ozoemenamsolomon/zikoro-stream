import { TOrganization } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  const supabase = createClient();
  if (req.method === "POST") {
    try {
      const params = await req.json();

      const {
        firstName,
        lastName,
        userEmail,
        userId,
        expiryDate,
        ...restData
      } = params;

      const { error } = await supabase.from("organization").upsert([
        {
          ...restData,
          organizationOwner: userEmail,
          organizationOwnerId: userId,
          subscriptionExpiryDate: expiryDate,
        },
      ]);

      if (error) {
        return NextResponse.json(
          { error: error?.message },
          {
            status: 400,
          }
        );
      }
      if (error) throw error;

      return NextResponse.json(
        { msg: "Organization Created Successfully" },
        {
          status: 200,
        }
      );
    } catch (error) {
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
