"use client";
import {
  Form,
  FormField,
  Input,
  InputFieldWrapper,
  Switch,
  UploadImage,
} from "@/components";
import { Button } from "@/components/custom/Button";
import { ReactSelect } from "@/components/custom/ReactSelect";
import { LiveStreamIcon } from "@/constants/icon";
import { useFetchWorkspace } from "@/hooks/organization";
import { useUserStore } from "@/store";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import _ from "lodash";
import { z } from "zod";
import { createStream } from "@/schemas/stream.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateOrganization } from "@/components/workspace/CreateOrganization";
import { TStream, TStreamAttendee } from "@/types/stream.type";
import { generateAlias, uploadFile } from "@/utils/utils";
import { usePostRequest } from "@/hooks";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postRequest } from "@/utils/api";

export function AddLiveStreamModal({ close }: { close: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { postData: addAttendee } = usePostRequest<Partial<TStreamAttendee>>(
    "/stream/attendee",
    "stream-attendee"
  );
  const form = useForm<z.infer<typeof createStream>>({
    resolver: zodResolver(createStream),
    defaultValues: {
      streamAlias: generateAlias(),
      settings: {
        registration: true,
        isLive: false,
      },
    },
  });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUserStore();

  if (!user) return;

  const {
    data: workspaces,
    isLoading: workspacesIsLoading,
    refetch: refetchWorkspaces,
  } = useFetchWorkspace(user?.id!);

  const streamFn = async ({ payload }: { payload: Partial<TStream> }) => {
    try {
      const { data, status } = await postRequest<TStream>({
        endpoint: "/stream",
        payload,
      });

      return data;
    } catch (error: any) {
      //
      throw error;
    } finally {
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: streamFn,
    onSuccess: (data) => {
      router.push(`/ls/${data.data.streamAlias}`);

      addAttendee({
        payload: {
          firstName: user?.lastName,
          lastName: user?.firstName,
          email: user?.userEmail,
          workspaceAlias: data.data.workspace,
          streamAlias: data.data.streamAlias,
          raisedHand: false,
          isActive: true,

          userId: user?.id,
        },
      });
    },
    onError: () => {
      console.log("Error");
    },
  });

  async function onSubmit(values: z.infer<typeof createStream>) {
    setLoading(true);
    const image = await new Promise(async (resolve) => {
      if (typeof values?.image === "string") {
        resolve(values?.image);
      } else if (values?.image && values?.image[0]) {
        const img = await uploadFile(values?.image[0], "image");
        resolve(img);
      } else {
        resolve(null);
      }
    });
    const payload: Partial<TStream> = {
      ...values,
      image: image as string,
      createdBy: user?.id,
    };

    mutate({ payload });

    setLoading(false);
  }

  const coverImg = form.watch("image");
  const addedImage = useMemo(() => {
    if (typeof coverImg === "string") {
      return coverImg;
    } else if (coverImg && coverImg[0]) {
      return URL.createObjectURL(coverImg[0]);
    } else {
      return null;
    }
  }, [coverImg]);

  const formattedList = useMemo(() => {
    const restructuredList = workspaces?.map(
      ({ organizationAlias, organizationName }) => {
        return { value: organizationAlias, label: organizationName };
      }
    );
    return _.uniqBy(restructuredList, "value");
  }, [workspaces]);

  const registration = useWatch({
    control: form.control,
    name: "settings.registration",
  });
  return (
    <div className="w-full h-full inset-0 bg-black/50 fixed z-50 ">
      <div className=" h-fit rounded-xl max-h-[85%] animate-float-in  inset-0 absolute m-auto max-w-3xl w-full vert-scroll bg-white overflow-y-auto">
        <div className="w-full flex flex-col  items-start p-4 justify-start gap-3">
          <Button
            onClick={close}
            className="h-10 w-10 px-0  flex items-center justify-center self-end rounded-full bg-zinc-700"
          >
            <InlineIcon
              icon={"mingcute:close-line"}
              fontSize={22}
              color="#ffffff"
            />
          </Button>

          <>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col text-sm items-center gap-4 w-full"
              >
                <div className="flex items-center flex-col justify-center mb-4 gap-y-2">
                  <p className="font-semibold gradient-text bg-basePrimary">
                    Live Stream
                  </p>
                  <LiveStreamIcon />
                </div>

                <UploadImage image={addedImage} name="image" form={form} />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <InputFieldWrapper label="Title">
                      <Input
                        placeholder="Enter title"
                        type="text"
                        {...form.register("title")}
                        className="placeholder:text-sm h-11 text-gray-700"
                      />
                    </InputFieldWrapper>
                  )}
                />

                <div className="w-full flex items-end gap-x-2">
                  <FormField
                    control={form.control}
                    name="workspace"
                    render={({ field }) => (
                      <InputFieldWrapper label="Organization">
                        <ReactSelect
                          {...field}
                          placeHolder="Select a Workspace"
                          options={formattedList}
                        />
                      </InputFieldWrapper>
                    )}
                  />
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsOpen(true);
                    }}
                    className="bg-basePrimary text-white  rounded-md  gap-x-2 h-11 font-medium"
                  >
                    <InlineIcon
                      icon="simple-line-icons:plus"
                      fontSize={20}
                      color="#fff"
                    />
                    <p className="text-sm">Workspace</p>
                  </Button>
                </div>

                <div className="flex w-full text-mobile sm:text-sm items-center justify-between">
                  <div className="flex flex-col items-start justify-start">
                    <p>Registration</p>
                    <p className="text-xs text-gray-500">
                      Attendees require registration to join the stream
                    </p>
                  </div>

                  <Switch
                    checked={registration}
                    disabled={loading}
                    onCheckedChange={(checked) =>
                      form.setValue("settings.registration", checked)
                    }
                    className=""
                  />
                </div>

                <Button
                  disabled={loading}
                  className="text-white h-11 gap-x-2 font-medium bg-basePrimary w-full max-w-xs mt-4"
                >
                  {loading && (
                    <Loader2Icon size={20} className="animate-spin" />
                  )}
                  <p> Create</p>
                </Button>
              </form>
            </Form>
            {isOpen && (
              <CreateOrganization
                close={() => setIsOpen(false)}
                refetch={refetchWorkspaces}
              />
            )}
          </>
        </div>
      </div>
    </div>
  );
}
