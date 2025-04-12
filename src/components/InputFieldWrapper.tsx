import {
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";
  import React from "react";
  import { cn } from "@/lib/utils";
  
  export function InputFieldWrapper({
    children,
    label,
    isRequired,
    append,
    prepend,
    className
  }: {
    children: React.ReactNode;
    label: string;
    isRequired?: boolean;
    append?: React.ReactNode;
    prepend?: React.ReactNode;
    className?:string
  }) {
    return (
      <FormItem className={cn("relative space-y-4 w-full",className)}>
        <FormLabel className="mb-2 text-gray-600">
          {label}
          {isRequired && <sup className="text-red-700">*</sup>}
        </FormLabel>
        {append && (
          <div className="absolute !my-0 left-2 z-10 h-full flex items-center">
            {append}
          </div>
        )}
        {prepend && (
          <div className="absolute !my-0 right-2 z-10 h-full flex items-center">
            {prepend}
          </div>
        )}
        <FormControl className="!mt-0">
          <div
            className={`${append ? "[&>*]:pl-8" : ""} ${
              prepend ? "[&>*]:pr-8" : ""
            }  w-full`}
          >
            <div className="w-full ">
              {children}
            </div>
          </div>
        </FormControl>
  
        <FormMessage />
      </FormItem>
    );
  }
  