"use client"
import { Form, FormField, Input, InputFieldWrapper, UploadImage } from "@/components";
import { Button } from "@/components/custom/Button";
import { ReactSelect } from "@/components/custom/ReactSelect";
import { LiveStreamIcon } from "@/constants/icon";
import { useFetchWorkspace } from "@/hooks/organization";
import { useUserStore } from "@/store";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import _ from "lodash"

export function AddLiveStreamModal({ close }: { close: () => void }) {
    const form = useForm({})
    const [loading, setLoading] =useState(false)
    const [isOpen,setIsOpen] = useState(false)
    const {user} = useUserStore()

    if (!user) return;

    const {
        data: workspaces,
        isLoading: workspacesIsLoading,
        refetch: refetchWorkspaces,
        
      } = useFetchWorkspace(user?.id!);

    async function onSubmit(values: any) {
        
    }


    const coverImg = form.watch("coverImage");
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
          <p className="font-semibold gradient-text bg-basePrimary">Live Stream</p>
            <LiveStreamIcon />
            
          </div>

          <UploadImage image={addedImage} name="coverImage" form={form} />
          <FormField
            control={form.control}
            name="coverTitle"
            render={({ field }) => (
              <InputFieldWrapper label="QA Title">
                <Input
                  placeholder="Enter title"
                  type="text"
                  {...form.register("coverTitle")}
                  className="placeholder:text-sm h-11 text-gray-700"
                />
              </InputFieldWrapper>
            )}
          />
     
          <div className="w-full flex items-end gap-x-2">
            <FormField
              control={form.control}
              name="workspaceAlias"
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
              setIsOpen(true)
              }}
              className="bg-basePrimary text-white  rounded-md  gap-x-2 h-11 font-medium"
            >
              <InlineIcon icon="simple-line-icons:plus" fontSize={20} color="#fff" />
              <p className="text-sm">Workspace</p>
            </Button>
          </div>

          <Button
            disabled={loading}
            className="text-white h-11 gap-x-2 font-medium bg-basePrimary w-full max-w-xs mt-4"
          >
            {loading && <Loader2Icon size={20} className="animate-spin" />}
            <p> Create</p>
          </Button>
        </form>
      </Form>
      {/* {isOpen && (
        <CreateOrganization close={onClose} refetch={getOrganizations} />
      )} */}
    </>
      </div>


     
    </div>
   </div>
  );
}
