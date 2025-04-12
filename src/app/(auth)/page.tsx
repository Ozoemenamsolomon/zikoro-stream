import Login from "@/components/auth/Login";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom: string }>;
}) {
  const { redirectedFrom } = await searchParams;

  return <Login redirectedFrom={redirectedFrom} />;
}
