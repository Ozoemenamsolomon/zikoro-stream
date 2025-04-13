"use client";

import Image from "next/image";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
export function UploadImage({
  image,
  name,
  form,
}: {
  name: string;
  form: UseFormReturn<z.infer<any>, any, any>;
  image: string | null;
}) {
  return (
    <div className=" rounded-lg p-4 border  w-72 bg-baseColor-100 h-72 flex flex-col items-center justify-center relative">
      <p className="underline">Add Cover Image</p>
    
      {image && (
        <Image
          src={image}
          width={500}
          height={600}
          className="w-full h-72 inset-0 z-10 object-cover rounded-lg absolute"
          alt=""
        />
      )}
      <label
        htmlFor="upload-stream-image"
        className="w-full h-full absolute inset-0 z-20"
      >
        <input
          id="upload-stream-image"
          type="file"
          {...form.register(name)}
          accept="image/*"
          className="w-full h-full z-30 absolute inset-0 "
          hidden
        />
      </label>
    </div>
  );
}
