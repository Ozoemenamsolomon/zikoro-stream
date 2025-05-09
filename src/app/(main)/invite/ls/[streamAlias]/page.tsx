import StreamInviteeRegsitration from "@/components/livestream/streamInvitee/StreamInviteeRegistration";

export default async function Page({
  params,
}: {
  params: Promise<{ streamAlias: string }>;
}) {
  const { streamAlias } = await params;
  return <StreamInviteeRegsitration streamAlias={streamAlias} />;
}
