import SignUp from "@/components/auth/SignUp";

export default function Page({
  searchParams: { userEmail },
}: {
  searchParams: { userEmail: string };
}) {
  return <SignUp emailParam={userEmail} />;
}
