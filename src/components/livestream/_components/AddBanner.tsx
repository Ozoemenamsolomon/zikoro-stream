import {
  Button,
  Form,
  FormField,
  Input,
  InputFieldWrapper,
} from "@/components";
import {
  EditStreamBanner,
  InvisibleStreamBanner,
  VisibleStreamBanner,
} from "@/constants/icon";
import { usePostRequest } from "@/hooks";
import { colors } from "@/lib/data";
import { cn } from "@/lib/utils";
import { createStreamBanner } from "@/schemas/stream.schema";
import { TSreamBanner, TStream } from "@/types/stream.type";
import { generateAlias } from "@/utils/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { TwitterPicker } from "react-color";
import { useForm, UseFormReturn, useWatch } from "react-hook-form";
import { z } from "zod";

enum BannerModalEnum {
  bannerList,
  add,
  empty,
}

function ColorPicker({
  form,
  close,
  name,
  colors,
}: {
  form: UseFormReturn<any, any, any>;
  close: () => void;
  name: any;
  colors: string[];
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className="absolute top-12"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          close();
        }}
        className="w-full h-full inset-0 fixed z-[100]"
      ></button>
      <div className="w-[200px] relative z-[150]">
        <TwitterPicker
          color={form.watch(name)}
          colors={colors}
          onChange={(color, event) => form.setValue(name, color.hex)}
          className="h-[250px] w-[200px]"
        />
      </div>
    </div>
  );
}

export function ColorPickerWidget({
  name,
  className,
  form,
  currentColor,
  colors,
}: {
  form: UseFormReturn<any, any, any>;
  name: any;
  className?: string;
  currentColor: string;
  colors: string[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <div
      className={cn("border h-12 flex items-center rounded-xl p-1", className)}
    >
      <div
        style={{
          backgroundColor: currentColor || "#001ffc",
        }}
        onClick={() => setShowPicker((prev) => !prev)}
        className="relative h-full rounded-xl w-[100px]"
      >
        {showPicker && (
          <ColorPicker
            close={() => setShowPicker((prev) => !prev)}
            form={form}
            name={name}
            colors={colors}
          />
        )}
      </div>
      <Input
        type="text"
        placeholder="#001FFC"
        readOnly
        {...form.register(name)}
        className="placeholder:text-sm border-0 w-[70px]  px-1 h-full text-zinc-700"
      />
    </div>
  );
}

export function ColorWidget({
  form,
  title,
  name,
  currentColor,
  colorArray,
}: {
  title: string;
  form: UseFormReturn<z.infer<typeof createStreamBanner>, any, any>;
  name: string;
  currentColor: string;
  colorArray: string[];
}) {
  return (
    <div className="flex flex-col items-start justify-start gap-y-3">
      <p className="font-medium text-mobile sm:text-sm">{title}</p>
      <ColorPickerWidget
        colors={colorArray}
        name={name}
        form={form}
        currentColor={currentColor}
      />
    </div>
  );
}

function BannerWidget({
  banner,
  toggleVisibility,
  editBanner,
  deleteBanner,
}: {
  banner: TSreamBanner;
  toggleVisibility: (bannerId: string) => void;
  editBanner: (banner: TSreamBanner) => void;
  deleteBanner: (bannerId: string) => void;
}) {
  return (
    <div className="w-full">
      <div
        style={{
          backgroundColor: banner?.backgroundColor || "",
          color: banner?.textColor,
        }}
        className="w-full rounded-t-xl p-3"
      >
        {banner?.content}
      </div>
      <div className="w-full flex items-center border bg-white rounded-b-xl py-3 justify-center gap-x-2">
        <Button
          onClick={() => toggleVisibility(banner?.bannerId)}
          className="h-10 rounded-xl gap-x-2 bg-baseColor-200 border border-baseColor"
        >
          {banner?.isActive ? (
            <InvisibleStreamBanner />
          ) : (
            <VisibleStreamBanner />
          )}
          <p className="gradient-text gap-x-2 bg-basePrimary">
            {banner?.isActive ? "Hide" : "Show"}
          </p>
        </Button>
        <Button
          onClick={() => editBanner(banner)}
          className="h-10 rounded-xl  gap-x-2 bg-baseColor-200 border border-baseColor"
        >
          <EditStreamBanner />
          <p className="gradient-text bg-basePrimary">Edit</p>
        </Button>
        <Button
          onClick={() => deleteBanner(banner?.bannerId)}
          className="font-medium text-[#E63946] border border-[#E63946] rounded-xl h-10 bg-[#E63946]/40"
        >
          <InlineIcon icon="fluent:delete-48-filled" color="#E63946" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function BannerListComp({
  banners,
  setEditBanner,
  stream,
}: {
  banners: TSreamBanner[];
  stream: TStream;
  setEditBanner: React.Dispatch<React.SetStateAction<TSreamBanner | null>>;
}) {
  const { postData, isLoading } = usePostRequest<TStream>("stream");
  function editBanner(banner: TSreamBanner) {
    setEditBanner(banner);
  }

  async function deleteBanner(bannerId: string) {
    if (isLoading) return;
    const filtered = banners?.filter((v) => v?.bannerId !== bannerId);
    await postData({ payload: { ...stream, banner: filtered } });
  }

  async function toggleVisibility(bannerId: string) {
    if (isLoading) return;
    const updated = banners?.map((b) => {
      if (b?.bannerId === bannerId) {
        return {
          ...b,
          isActive: !b?.isActive,
        };
      }
      return { ...b, isActive: false };
    });

    await postData({ payload: { ...stream, banner: updated } });
  }
  return (
    <div className="w-full flex flex-col my-6 items-start justify-start gap-3">
      {banners?.map((banner) => (
        <BannerWidget
          banner={banner}
          editBanner={editBanner}
          deleteBanner={deleteBanner}
          toggleVisibility={toggleVisibility}
          key={banner?.bannerId}
        />
      ))}
    </div>
  );
}

export function AddBanner({
  close,
  banners,
  stream,
}: {
  close: () => void;
  banners: TStream["banner"];
  stream: TStream;
}) {
  const [currentBanner, setEditBanner] = useState<TSreamBanner | null>(null);
  const [active, setActive] = useState<BannerModalEnum>(
    banners?.length > 0 ? 0 : 2
  );

  const { postData, isLoading } = usePostRequest<Partial<TStream>>("stream");
  const form = useForm<z.infer<typeof createStreamBanner>>({
    resolver: zodResolver(createStreamBanner),
    defaultValues: {
      backgroundColor: "#001FCC",
      textColor: "#FFFFFF",
    },
  });

  console.log(banners, active);

  const bannerBackground = useWatch({
    control: form.control,
    name: "backgroundColor",
  });

  const bannerTextColor = useWatch({
    control: form.control,
    name: "textColor",
  });

  useEffect(() => {
    if (currentBanner) {
      form.reset({
        backgroundColor: currentBanner?.backgroundColor,
        content: currentBanner?.content,
        textColor: currentBanner?.textColor,
      });

      setActive(BannerModalEnum.add);
    }
  }, [currentBanner]);

  async function onSubmit(values: z.infer<typeof createStreamBanner>) {
    const banner: TSreamBanner = currentBanner
      ? {
          ...values,
          bannerId: currentBanner?.bannerId,
          isActive: currentBanner?.isActive,
        }
      : {
          ...values,
          bannerId: generateAlias(),
          isActive: false,
        };

    const banners =
      !stream?.banner ||
      (Array.isArray(stream?.banner) && stream?.banner?.length === 0)
        ? [banner]
        : currentBanner
        ? stream?.banner?.map((b) => {
            if (b?.bannerId === currentBanner?.bannerId) {
              return {
                ...banner,
              };
            }
            return { ...b };
          })
        : [...stream?.banner, banner];

    await postData({ payload: { ...stream, banner: banners } });
    setEditBanner(null);
    setActive(BannerModalEnum.bannerList);
  }

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

          <div className="w-full mx-auto max-w-[85%]">
            {BannerModalEnum.empty === active && (
              <div className="w-full flex items-center my-10 justify-center flex-col gap-6">
                <InlineIcon icon="entypo:flag" fontSize={30} />
                <h2 className="font-semibold text-lg sm:text-xl mt-2">
                  Display Banner
                </h2>

                <p className="text-center">
                  A Banner allows you to showcase key information as an overlay
                  on stage, ensuring clear and impactful visibility.
                </p>
                <Button
                  onClick={() => setActive(BannerModalEnum.add)}
                  className="w-fit bg-basePrimary text-white font-medium rounded-xl"
                >
                  Create Banner
                </Button>
              </div>
            )}
            {BannerModalEnum.add === active && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="w-full flex my-8 flex-col items-start justify-start gap-4"
                >
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <InputFieldWrapper label="Banner Content">
                        <Input
                          type="text"
                          placeholder="Enter content"
                          {...field}
                          className="h-11 placeholder:text-sm placeholder:text-zinc-500 text-zinv-700"
                        />
                      </InputFieldWrapper>
                    )}
                  />
                  <ColorWidget
                    colorArray={colors}
                    currentColor={bannerBackground}
                    form={form}
                    name="backgroundColor"
                    title="Background Color"
                  />
                  <ColorWidget
                    colorArray={colors}
                    currentColor={bannerTextColor}
                    form={form}
                    name="textColor"
                    title="Text Color"
                  />

                  <Button className="w-fit self-center gap-x-2 px-10 mt-3 bg-basePrimary text-white font-medium rounded-xl">
                    {isLoading && <Loader2Icon size={20} />}
                    Add Banner
                  </Button>
                </form>
              </Form>
            )}
            {BannerModalEnum.bannerList === active && (
              <div className="w-full flex my-6 flex-col">
                <Button
                  onClick={() => {
                    form.reset({}), setActive(BannerModalEnum.add);
                  }}
                  className="w-fit self-end mb-3 bg-basePrimary text-white font-medium rounded-xl"
                >
                  Create Banner
                </Button>

                <BannerListComp
                  setEditBanner={setEditBanner}
                  banners={banners}
                  stream={stream}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
