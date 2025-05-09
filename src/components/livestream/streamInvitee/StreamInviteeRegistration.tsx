"use client";
import { LoadingState } from "@/components/custom/LoadingState";
import { Form, Button, FormField, Input } from "@/components";
import { InputFieldWrapper } from "@/components";
import {
  useGetData,
  usePostRequest,
  useRegistration,
  useResendLink,
  userExist,
  useSetLoggedInUser,
  useVerifyCode,
} from "@/hooks";
import { TOrganizerStream, TStream, TStreamAttendee } from "@/types";
import Image from "next/image";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { useEffect, useState } from "react";
import { z } from "zod";
import { streamRegsitration } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import VerificationInput from "react-verification-input";
import { postRequest } from "@/utils/api";
import { generateAlias } from "@/utils/utils";

type Join = {
  email: string;
};
function JoinStream({
  streamAlias,
  setActive,
  stream,
}: {
  streamAlias: string;
  setActive: React.Dispatch<React.SetStateAction<number>>;
  stream: TOrganizerStream;
}) {
  const router = useRouter();
  const form = useForm<Join>({});
  const { postData } = usePostRequest<Partial<TStream>>("/stream", "stream");
  const { postData: addAttendee } = usePostRequest<Partial<TStreamAttendee>>(
    "/stream/attendee",
    "stream-attendee"
  );
  const [loading, setLoading] = useState(false);
  const { setLoggedInUser } = useSetLoggedInUser();

  //> sign with email only
  async function onSubmit(values: Join) {
    setLoading(true);
    // check if the user exist in the admin
    const isExists = await userExist(values.email);

    //> else throw error and return
    if (!isExists) {
      toast.error("You are not a registered user");
      setLoading(false);
      return;
    }

    const { users, ...restData } = stream;

    //> proceed to fetch user detail
    // from the users table and persist the data
    await setLoggedInUser(values?.email).then((response) => {
      if (response) {
        const invitee = {
          id: generateAlias(),
          firstName: response?.lastName,
          lastName: response?.firstName,
          email: response?.userEmail,
          workspaceAlias: stream?.workspace,
          streamAlias: streamAlias,
          raisedHand: false,
          isActive: true,
          userId: response?.id,
          isInvitee: true,
        };
        const invitees = restData?.invitees ?? [];

        //> already joined
        const isAlreadyPresent = invitees?.some(
          (d) => d?.userId === response?.id
        );

        if (isAlreadyPresent) return router.push(`/ls/${streamAlias}`);

        invitees.push(invitee);
        const payload: Partial<TStream> = {
          ...restData,
          invitees,
        };
        postData({ payload });

        addAttendee({
            payload: {
              firstName: response?.lastName,
              lastName: response?.firstName,
              email: response?.userEmail,
              workspaceAlias: stream?.workspace,
            streamAlias: streamAlias,
              raisedHand: false,
              isActive: true,
              userId: response?.id,
            },
          });

        router.push(`/ls/${streamAlias}`);
      }
    });
    setLoading(false);
    //> return if the user does not exist in the users table
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col items-center gap-3"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <InputFieldWrapper label="">
                <Input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  {...field}
                  className=" placeholder:text-sm h-11  text-gray-700"
                />
              </InputFieldWrapper>
            )}
          />

          <Button className="font-medium mt-3 gap-x-2 text-white bg-basePrimary rounded-lg">
            {loading && <Loader2Icon size={20} className="animate-spin" />}
            Join Stream
          </Button>

          <div className="text-center flex gap-x-2 items-center justify-center">
            Don't have an account yet?{" "}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActive(1);
              }}
              className="font-medium text-baseColor"
            >
              Register
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Register({
  streamAlias,
  setActive,
  stream,
}: {
  streamAlias: string;
  setActive: React.Dispatch<React.SetStateAction<number>>;
  stream: TOrganizerStream;
}) {
  const [loading, setLoading] = useState(false);
  const { register } = useRegistration({ isJoiningStream: true });
  const [curentActive, setCurrentActive] = useState(0);
  const form = useForm<z.infer<typeof streamRegsitration>>({
    resolver: zodResolver(streamRegsitration),
  });
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(values: z.infer<typeof streamRegsitration>) {
    setLoading(true);
    const isExists = await userExist(values.email).catch(() => {
      setLoading(false);
    });

    //> else throw error and return
    if (isExists) {
      toast.error("You are already a registered user");
      setLoading(false);
      return;
    }

    // regsiter
    await register({ email: values.email, password: values.password }).then(
      () => {
        setCurrentActive(1);
      }
    );
    setLoading(false);
    // enter code
  }

  const email = form.watch("email");
  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");
  return (
    <>
      {curentActive === 0 && (
        <div className="w-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full flex flex-col items-center gap-3"
            >
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <InputFieldWrapper label="First Name">
                      <Input
                        type="text"
                        required
                        placeholder="Enter your first name"
                        {...field}
                        className=" placeholder:text-sm h-11  text-gray-700"
                      />
                    </InputFieldWrapper>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <InputFieldWrapper label="Last Name">
                      <Input
                        type="text"
                        required
                        placeholder="Enter your last name"
                        {...field}
                        className=" placeholder:text-sm h-11  text-gray-700"
                      />
                    </InputFieldWrapper>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <InputFieldWrapper label="Email">
                    <Input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      {...field}
                      className=" placeholder:text-sm h-11  text-gray-700"
                    />
                  </InputFieldWrapper>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <InputFieldWrapper label="Password">
                    <div className="relative h-11 w-full">
                      <Input
                        placeholder="Enter Password"
                        type={showPassword ? "text" : "password"}
                        {...field}
                        className=" placeholder:text-sm h-11  text-gray-700"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setShowPassword((prev) => !prev);
                        }}
                        className="absolute right-3 inset-y-1/4"
                      >
                        {showPassword ? (
                          <InlineIcon
                            icon="iconamoon:eye-off-light"
                            fontSize={20}
                          />
                        ) : (
                          <InlineIcon icon="iconamoon:eye-thin" fontSize={20} />
                        )}
                      </button>
                    </div>
                  </InputFieldWrapper>
                )}
              />

              <Button
                disabled={loading}
                className="font-medium mt-3 gap-x-2 text-white bg-basePrimary rounded-lg"
              >
                {loading && <Loader2Icon size={20} className="animate-spin" />}
                Register
              </Button>

              <div className="text-center flex gap-x-2 items-center justify-center">
                Already have an account?{" "}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActive(0);
                  }}
                  className="font-medium text-baseColor"
                >
                  Login
                </button>
              </div>
            </form>
          </Form>
        </div>
      )}
      {curentActive === 1 && (
        <VerifyEmailWidget
          email={email}
          firstName={firstName}
          lastName={lastName}
          setCurrentActive={setCurrentActive}
          streamAlias={streamAlias}
          stream={stream}
        />
      )}
    </>
  );
}

function VerifyEmailWidget({
  email,
  setCurrentActive,
  firstName,
  lastName,
  streamAlias,
  stream,
}: {
  firstName: string;
  lastName: string;
  email: string;
  setCurrentActive: React.Dispatch<React.SetStateAction<number>>;
  streamAlias: string;
  stream: TOrganizerStream;
}) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(60);
  const { verifyCode } = useVerifyCode({ isJoiningStream: true });
  const { resendLink } = useResendLink();
  const [loading, setLoading] = useState(false);
  const { setLoggedInUser } = useSetLoggedInUser();
  const [code, setCode] = useState("");
  const { postData } = usePostRequest<Partial<TStream>>("/stream", "stream");
  const { postData: addAttendee } = usePostRequest<Partial<TStreamAttendee>>(
    "/stream/attendee",
    "stream-attendee"
  );

  async function onSubmit() {
    setLoading(true);

    await verifyCode(email!, code, "").catch(() => {
      toast.error("An error occurred while verify your email. Try again");
      setLoading(false);
      return;
    });

    const { data, status } = await postRequest<any>({
      endpoint: "/auth/user",
      payload: {
        firstName,
        lastName,
        userEmail: email,
        created_at: new Date().toISOString(),
      },
    });

    if (status === 201 || status === 200) {
      await setLoggedInUser(email).then((response) => {
        if (response) {
          const { users, ...restData } = stream;

          const invitee = {
            id: generateAlias(),
            firstName: response?.lastName,
            lastName: response?.firstName,
            email: response?.userEmail,
            workspaceAlias: stream?.workspace,
            streamAlias: streamAlias,
            raisedHand: false,
            isActive: false,
            isInvitee: true,
            userId: response?.id,
          };

          const invitees = restData?.invitees ?? [];

          invitees.push(invitee);
          const payload: Partial<TStream> = {
            ...restData,
            invitees,
          };
          postData({ payload });

          addAttendee({
            payload: {
              firstName: response?.lastName,
              lastName: response?.firstName,
              email: response?.userEmail,
              workspaceAlias: stream?.workspace,
            streamAlias: streamAlias,
              raisedHand: false,
              isActive: true,
              userId: response?.id,
            },
          });
          router.push(`/ls/${streamAlias}`);
          setLoading(false);

      
        }
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setSecondsLeft((prevSeconds) => {
        if (prevSeconds === 0) {
          clearInterval(countdownInterval);
        }

        return Math.max(0, prevSeconds - 1);
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);
  return (
    <div className="w-full">
      <div className="w-full  flex flex-col justify-center gap-y-3 items-center">
        <InlineIcon icon="ic:round-lock" fontSize={30} color="#001fcc" />
        <p className="font-medium text-center ">
          Confirm if {email} is your email address
        </p>
        <p className="text-center">
          Check your inbox or spam for verification code
        </p>
      </div>

      <div className="w-full flex items-center h-24 justify-center">
        <VerificationInput
          classNames={{
            character: "character",
            container: "container",
          }}
          placeholder=" "
          length={6}
          inputProps={{
            autoComplete: "one-time-code", // for IOS
          }}
          onChange={(value: string) => {
            setCode(value);
          }}
        />
      </div>

      <Button
        onClick={onSubmit}
        disabled={loading || code === "" || code.length < 6}
        className="font-medium my-6 mx-auto w-fit self-center gap-x-2 text-white bg-basePrimary rounded-lg"
      >
        {loading && <Loader2Icon size={20} className="animate-spin" />}
        Join Stream
      </Button>

      <div className="w-full sm:max-w-md mx-auto flex items-center justify-between">
        <button onClick={() => setCurrentActive(0)} className="underline">
          Go Back
        </button>

        <div className="flex items-center gap-x-2">
          <button
            onClick={async () => {
              await resendLink(email);
              setSecondsLeft(60);
            }}
            className="underline"
          >
            Resend code
          </button>
          <p>{`0:${secondsLeft >= 10 ? "" : "0"}${secondsLeft}`}</p>
        </div>
      </div>
    </div>
  );
}

export default function StreamInviteeRegsitration({
  streamAlias,
}: {
  streamAlias: string;
}) {
  const [active, setActive] = useState(0);
  const { data: stream, isLoading } = useGetData<TOrganizerStream>(
    `/stream/join/${streamAlias}`,
    "stream"
  );

  if (isLoading && !stream) {
    return <LoadingState />;
  }
  return (
    <div className="w-full">
      <div className="w-full p-4 sm:p-6 mx-auto mt-8 sm:mt-10 max-w-3xl">
        <h2 className="font-semibold text-center text-base sm:text-lg mb-4 sm:mb-6">
          Join Live Stream
        </h2>

        <div className="w-full flex items-center flex-col sm:flex-row gap-3">
          {stream?.image && (stream?.image as string).startsWith("https://") ? (
            <Image
              className="w-[100px] sm:w-[200px] rounded-xl h-[100px] sm:h-[200px]  object-cover"
              alt="gift"
              src={stream?.image}
              width={400}
              height={400}
            />
          ) : (
            <div className="w-[100px] sm:w-[200px] rounded-xl h-[100px] sm:h-[200px]  bg-white"></div>
          )}
          {/** 1 */}
          <div className="flex flex-col items-center sm:items-start justify-center sm:justify-start gap-1">
            <h3 className="font-semibold text-sm mb-2 sm:text-base">
              {stream?.title ?? ""}
            </h3>

            <p className="">Host:</p>
            <div className="flex items-center gap-x-2">
              <p className="rounded-full flex items-center uppercase justify-center bg-basePrimary text-white w-10 h-10 font-semibold">
                {stream?.users?.firstName.charAt(0)}
                {stream?.users?.lastName.charAt(0)}
              </p>
              <p className="capitalize">
                {stream?.users?.firstName} {stream?.users?.lastName}
              </p>
            </div>
          </div>
        </div>

        {/**2 */}

        <div className="w-full bg-white mt-8 sm:mt-12 p-4 sm:p-6 rounded-xl">
          {active === 0 && stream && (
            <JoinStream
              setActive={setActive}
              stream={stream}
              streamAlias={streamAlias}
            />
          )}
          {active === 1 && stream && (
            <Register
              setActive={setActive}
              stream={stream}
              streamAlias={streamAlias}
            />
          )}
        </div>
      </div>
    </div>
  );
}
