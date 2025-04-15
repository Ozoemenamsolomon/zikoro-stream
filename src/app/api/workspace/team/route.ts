import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  if (req.method === "POST") {
    try {
      const params = await req.json();

      const { error } = await supabase
        .from("organizationTeamMembers_Engagement")
        .upsert([params]);

      //organizationTeamMembers

      if (error) {
        return NextResponse.json(
          { error: error?.message },
          {
            status: 400,
          }
        );
      }
      if (error) throw error;
      //
      const { error: cError } = await supabase
        .from("organizationTeamMembers_Credentials")
        .upsert([params]);

      if (cError) {
        return NextResponse.json(
          { nError: cError?.message },
          {
            status: 400,
          }
        );
      }
      if (cError) throw cError;

      const { error: nError } = await supabase
        .from("organizationTeamMembers")
        .upsert([params]);

      if (nError) {
        return NextResponse.json(
          { nError: nError?.message },
          {
            status: 400,
          }
        );
      }
      if (nError) throw nError;

      //
      const { error: bError } = await supabase
        .from("organizationTeamMembers_Bookings")
        .upsert([params]);

      if (nError) {
        return NextResponse.json(
          { bError: bError?.message },
          {
            status: 400,
          }
        );
      }
      if (bError) throw bError;

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

//
