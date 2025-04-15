"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import dynamic from "next/dynamic";
const PaystackButton = dynamic(
  () => import("react-paystack").then((mod) => mod.PaystackButton),
  { ssr: false }
);
import {useUserStore} from "@/store";
import { usePostRequest, paymentConfig } from "@/hooks";
import { ISubscription, TOrganizationTeamMember } from "@/types";


type TParsedData = {
  paymentReference: string;
  email: string;
  total: string;
  currency: string;
  discount: string;
  discountCode: string;
  organizationAlias: string;
  redirectUrl: string;
  isMonthly: string;
  plan: string;
  organizationName: string;
  organizationType: string;
  subscriptionPlan: string;
  teamMember: TOrganizationTeamMember;
};
export default function OrgPayment({
  searchParams: { data },
}: {
  searchParams: any;
}) {
  const router = useRouter();
  const { user } = useUserStore();
  const { postData } = usePostRequest<Partial<ISubscription>>(
    "/subscription/create"
  );
  const { postData: organization } = usePostRequest<any>("workspace");
  const { postData: createTeamMember } =
    usePostRequest<Partial<TOrganizationTeamMember>>("workspace/team");
  const parsedData: TParsedData | null = useMemo(() => {
    if (data) {
      const decodedData = decodeURIComponent(data);
      const parsedData = JSON.parse(decodedData);
      return parsedData;
    }
    return null;
  }, [data]);

  async function handleSuccess(reference: any) {
    if (!parsedData) return;
    const today = new Date();
    const expiryDate = new Date();
    parsedData?.isMonthly === "true"
      ? expiryDate.setMonth(expiryDate.getMonth() + 1)
      : expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const payload: Partial<ISubscription> = {
      userId: user?.id!,
      subscriptionType: parsedData?.plan!,
      amountPayed:
        Number(parsedData?.total || 0) - Number(parsedData?.discount || 0),
      startDate: today.toISOString().split("T")[0],
      expirationDate: expiryDate.toISOString().split("T")[0],
      currency: parsedData?.currency!,
      monthYear: parsedData?.isMonthly === "true" ? "month" : "year",
      planPrice: Number(parsedData?.total || 0),
      discountValue: Number(parsedData?.discount || 0),
      discountCode: parsedData?.discountCode,
      organizationAlias: parsedData?.organizationAlias,
    };
    try {
      await postData({ payload });

      if (parsedData) {
        await organization({
          payload: {
            organizationName: parsedData?.organizationName,
            organizationType: parsedData?.organizationType,
            subscriptionPlan: parsedData?.subscriptionPlan,
            expiryDate: expiryDate.toISOString().split("T")[0],
            userEmail: user?.userEmail,
            lastName: user?.lastName,
            firstName: user?.firstName,
            userId: user?.id,
          },
        });

        await createTeamMember({ payload: parsedData?.teamMember });
        router.push(parsedData?.redirectUrl);
      }
    } catch (error) {
      console.log(error);
    }
  }
  const config = paymentConfig({
    reference: parsedData?.paymentReference!,
    email: parsedData?.email!,
    amount: Number(parsedData?.total),
    currency: parsedData?.currency,
  });

  const componentProps: any = {
    ...config,
    // text: 'Paystack Button Implementation',
    children: (
      <Button className="w-full min-w-[280px]  gap-x-2 bg-basePrimary text-gray-50 font-medium">
        <InlineIcon icon="ic:twotone-lock" fontSize={22} />
        <span>{`Pay ${parsedData?.currency} ${Number(
          parsedData?.total
        )?.toLocaleString()}`}</span>
      </Button>
    ),
    onSuccess: (reference: any) => handleSuccess(reference),
  };
  return (
    <div className="w-full bg-[#F9FAFF] fixed inset-0 h-full">
      <div className="max-w-lg m-auto flex flex-col items-start justify-start gap-y-3 p-4 w-[95%] inset-0 absolute h-fit">
        <Button
          onClick={() => router.back()}
          className="px-0 h-fit w-fit  bg-none  "
        >
         <InlineIcon icon="guidance:left-arrow" fontSize={22} />
        </Button>

        <div className="w-full bg-white h-fit flex items-center justify-center flex-col gap-y-5 rounded-lg p-4">
          <p className="font-semibold text-lg sm:text-xl">Order Summary</p>

          <div className="w-full border rounded-lg py-6 px-4">
            <p className="w-full border-b pb-2">Orders</p>

            <div className="w-full mt-6 mb-2 flex items-center justify-between">
              <p> SubTotal</p>
              <p className="font-medium">
                {parsedData?.currency}{" "}
                {(
                  Number(parsedData?.total || 0) -
                  Number(parsedData?.discount || 0)
                )?.toLocaleString()}
              </p>
            </div>

            <div className="w-full mt-6 mb-2 flex items-center justify-between">
              <p> Discount</p>
              <p className="font-medium">
                - {parsedData?.currency}{" "}
                {Number(parsedData?.discount || 0)?.toLocaleString()}
              </p>
            </div>

            <div className="w-full mt-6 flex items-center justify-between">
              <p className="font-semibold">Total</p>
              <p className="font-semibold">
                {parsedData?.currency}{" "}
                {Number(parsedData?.total || 0)?.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="w-full flex items-center justify-center">
            {parsedData?.total && Number(parsedData?.total) > 0 ? (
              <PaystackButton {...componentProps} />
            ) : (
              <Button
                onClick={() => handleSuccess("ref")}
                className="w-full gap-x-2 bg-basePrimary text-gray-50 font-medium"
              >
                <InlineIcon icon="ic:twotone-lock" color="#ffffff" fontSize={22} />
                <span>{`Confirm`}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
