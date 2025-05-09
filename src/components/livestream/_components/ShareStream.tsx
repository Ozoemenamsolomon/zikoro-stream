"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import QRCode from "react-qr-code";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";
import copy from "copy-to-clipboard";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, Form } from "@/components/ui/form";
import { InputFieldWrapper } from "@/components/InputFieldWrapper";
import { Input, Textarea, Button } from "@/components";
import { usePostRequest } from "@/hooks";
enum ShareType {
  link,
  email,
  socials,
}

function ShareAction({
  icon,
  name,
  type,
  active,
  setActive,
}: {
  type: ShareType;
  icon: string;
  name: string;
  active: number;
  setActive: React.Dispatch<React.SetStateAction<ShareType>>;
}) {
  return (
    <button
      onClick={() => setActive(type)}
      className={cn(
        "flex items-center px-4 py-2 border-b gap-x-2",
        active === type && "border-black"
      )}
    >
      <InlineIcon icon={icon} fontSize={20} />
      <p className="text-sm">{name}</p>
    </button>
  );
}

function LinkAction({ link }: { link: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center gap-4">
      <div className="w-full max-w-md flex items-center">
        <Button className="bg-basePrimary-200 w-[10%] px-0 rounded-r-none rounded-l-lg border-y-0 border-l border-r-0 h-11">
          <InlineIcon icon="solar:link-bold-duotone" fontSize={22} />
        </Button>
        <input
          value={link}
          type="text"
          readOnly
          className="w-[70%] text-mobile h-11 border bg-basePrimary-200 pl-4"
        />
        <Button
          onClick={() => {
            copy(link);
            toast.success("Copied!");
          }}
          className="w-[20%] rounded-r-lg rounded-l-none bg-basePrimary text-white text-mobile"
        >
          <span className="text-white"> Copy</span>
        </Button>
      </div>
      <QRCode size={200} value={link} />
    </div>
  );
}

function SocialAction({ link }: { link: string }) {
  return (
    <div className="w-full flex flex-col pt-8">
      <SocialWidget
        icon="mdi:linkedin"
        openLink={() =>
          window.open(`https://x.com/intent/tweet?url=${link}`, "_self")
        }
        name="LinkedIn"
      />
      <SocialWidget
        icon="uil:facebook"
        openLink={() =>
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${link}`,
            "_self"
          )
        }
        name="Facebook"
      />

      <SocialWidget
        icon="line-md:twitter-x"
        openLink={() =>
          window.open(
            `https://www.linkedin.com/shareArticle?url=${link}`,
            "_self"
          )
        }
        name="X(Formerly Twitter)"
      />
    </div>
  );
}

function SocialWidget({
  icon,
  name,
  openLink,
}: {
  icon: string;
  name: string;
  openLink: () => void;
}) {
  return (
    <div className="w-full flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-x-1">
        <InlineIcon icon={icon} fontSize={22} />
        <p>{name}</p>
      </div>
      <button onClick={openLink}>
        <InlineIcon
          icon="stash:content-share-duotone"
          fontSize={20}
          color="#001fcc"
        />
      </button>
    </div>
  );
}

function EmailAction({ link, title }: { link: string; title: string }) {
  const { postData } = usePostRequest("stream/share");
  const schema = z.object({
    emails: z.string().min(1, { message: "Email is required" }),
    message: z.string().min(1, { message: "Message is required" }),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      message: link,
    },
  });

  async function onSubmit(value: z.infer<typeof schema>) {
    const payload = {
      message: value.message,
      emails: value.emails.split(","),
      title,
    };
    await postData({ payload: payload });
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-6 items-start justify-start"
        >
          <FormField
            control={form.control}
            name="emails"
            render={({ field }) => (
              <InputFieldWrapper label="Recipients Email Address">
                <Input
                  placeholder="Enter comma separated email address"
                  type="text"
                  {...form.register("emails")}
                  className="placeholder:text-sm h-11 text-gray-700"
                />
              </InputFieldWrapper>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <InputFieldWrapper label="Message Body">
                <Textarea
                  placeholder="Enter Message"
                  {...form.register("message")}
                  className="placeholder:text-sm h-48 resize-none text-gray-700"
                ></Textarea>
              </InputFieldWrapper>
            )}
          />

          <Button
            type="submit"
            className="w-full mt-4 sm:w-[70%] self-center h-11 rounded-md bg-basePrimary text-white font-medium"
          >
            Submit
          </Button>
        </form>
      </Form>
    </div>
  );
}

export function ShareStream({
  close,
  urlLink,
  title,
}: {
  urlLink: string;
  close: () => void;
  title: string;
}) {
  const [active, setActive] = useState<ShareType>(ShareType.link);

  const actions = [
    { icon: "material-symbols-light:link", name: "Link", type: ShareType.link },
    { icon: "ic:outline-email", name: "Email", type: ShareType.email },
    {
      icon: "material-symbols-light:share-outline",
      name: "Social",
      type: ShareType.socials,
    },
  ];

  return (
    <div
      onClick={close}
      role="button"
      className="w-full h-full text-sm fixed inset-0 z-[300] bg-black/50"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="w-[95%] max-w-lg m-auto animate-float-in h-fit text-sm absolute inset-0 bg-white rounded-lg px-3 pt-3 pb-10"
      >
        <div className="w-full flex items-center mb-6 justify-between pb-3 border-b">
          <p>{title}</p>
          <Button
            onClick={close}
            className="h-8 w-8 px-0  flex items-center justify-center self-end rounded-full bg-zinc-700"
          >
            <InlineIcon
              icon={"mingcute:close-line"}
              fontSize={20}
              color="#ffffff"
            />
          </Button>
        </div>

        <div className="w-fit mb-6 flex items-center mx-auto justify-center">
          {actions.map((action, index) => (
            <ShareAction
              key={index}
              type={action.type}
              setActive={setActive}
              active={active}
              icon={action.icon}
              name={action.name}
            />
          ))}
        </div>

        {active === ShareType.link && <LinkAction link={urlLink} />}
        {active === ShareType.socials && <SocialAction link={urlLink} />}
        {active === ShareType.email && (
          <EmailAction link={urlLink} title={title} />
        )}
      </div>
    </div>
  );
}
