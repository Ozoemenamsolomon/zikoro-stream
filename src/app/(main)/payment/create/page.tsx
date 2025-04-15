import OrgPayment from "@/components/workspace/OrgPayment";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<any>;
}) {
  return <OrgPayment searchParams={await searchParams} />;
}
