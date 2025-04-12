import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


// Define the paths that should be protected
const includedPaths = [

];

//  "/event/:eventId/reception",
const dynamicPaths = [


]


export async function middleware(req: NextRequest) {
  const res = NextResponse.next();


//  //Check if the request path is included in the protected paths
//   const isIncludedPath = includedPaths.some((includedPath) =>
//     path.startsWith(includedPath)
//   );

//   if (isIncludedPath && !session) {
    
//     // If user is not authenticated and path is included, redirect to the login page
//     if (path.startsWith("/api")) {
//       return NextResponse.json(
//         { error: "Authorization failed" },
//         { status: 403 }
//       );
//     } else {
//       const redirectUrl = new URL("/login", req.url);
//       redirectUrl.searchParams.set("redirectedFrom", path);
//       return NextResponse.redirect(redirectUrl);
//     }
//   }

  // Allow the request to proceed if the user is authenticated or the path is not included
  return res;
}

export const config = {
  matcher: [
    
  ],
};


