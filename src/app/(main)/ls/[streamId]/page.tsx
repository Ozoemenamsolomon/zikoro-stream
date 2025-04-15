import Livestream from "@/components/livestream/LiveStream";

export default async  function Page({
  params,
}: {
  params: Promise<{streamId : string}>
})  {

  const {streamId} = await params;
  return <Livestream streamId={streamId} />;
}
