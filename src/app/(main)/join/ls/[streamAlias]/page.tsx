import StreamAttendeeRegsitration from "@/components/livestream/streamAttendee/StreamAttendeeRegistration";

export default async function Page({
  params,
}: {
  params: Promise<{ streamAlias: string }>;
}) {
  const { streamAlias } = await params;
  return <StreamAttendeeRegsitration streamAlias={streamAlias} />;
}
