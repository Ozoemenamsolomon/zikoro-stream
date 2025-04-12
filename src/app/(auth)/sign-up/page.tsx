import SignUp from "@/components/auth/SignUp";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ userEmail: string }>;
}) {
  const { userEmail } = await searchParams;

  return <SignUp emailParam={userEmail} />;
}
