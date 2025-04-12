import Login from "@/components/auth/Login";


export default function Page({
  searchParams: { redirectedFrom },
}: {
  searchParams: { redirectedFrom: string };
}) {
  return <Login redirectedFrom={redirectedFrom} />;
}
