"use client";

import Select from "react-select";
import { cn } from "@/lib/utils";
import * as React from "react";
import {
  UseControllerProps,
  UseControllerReturn,
  useController,
  FieldValues,
} from "react-hook-form";

interface SelectProps<T extends FieldValues> extends UseControllerProps<T> {
  options: { value: string; label: string }[];
  error?: string;
  label?: string;
  placeHolder: string;
  bgColor?: string;
  height?: string;
  borderColor?: string;
  placeHolderColor?: string;
  minHeight?: string;
}
function ErrorText({ children }: { children?: string }) {
  return (
    <div>
      {children && <p className="pt-1 text-xs text-red-500 ">{children}</p>}
    </div>
  );
}

export const ReactSelect = React.forwardRef<
  HTMLSelectElement,
  SelectProps<FieldValues>
>((props, ref) => {
  const {
    label,
    minHeight,
    options,
    bgColor,
    height,
    borderColor,
    placeHolderColor,
    error,
    placeHolder,
    defaultValue,
    ...controllerProps
  } = props;
  const {
    field: { onChange },
  } = useController(controllerProps) as UseControllerReturn<FieldValues>;

  return (
    <div className="w-full relative ">
      {/* {label && (
        <label
          className=" text-gray-600 mb-4 text-sm "
          htmlFor="select"
        >
          {label}
        </label>
      )} */}
     <div className={cn("w-full")}>
     <Select
        defaultValue={defaultValue}
        placeholder={placeHolder}
        styles={{
          control: (baseStyles, state) => ({
            ...baseStyles,
         
            height: "100%",
            minHeight: "46px",
             backgroundColor: "#F7F8FF",
            boxShadow: "0px",
            borderRadius: "6px",
            border: '1px',
            borderColor:"#e5e5e5"
          }),

          option: (baseStyles, state) => ({
            ...baseStyles,
            textAlign: "start",
            color: state?.isSelected ? "black" : "black",
            backgroundColor: state?.isFocused ? "#e2e8f0" : "",
          }),
          singleValue: (baseStyles) => ({
            ...baseStyles,
            textAlign: "start",
            textDecoration: "capitalize",
            fontSize: "13px",
            padding: "4px",
          }),
          placeholder: (baseStyles) => ({
            ...baseStyles,
            textAlign: "start",
            color: '#6b7280',
            fontSize: "13px",
          }),
          menu: (baseStyles) => ({
            ...baseStyles,
            borderRadius: "6px",
            zIndex: 100,
            fontSize: "13px",
          }),
          dropdownIndicator: (baseStyle) => ({
            ...baseStyle,
            borderRight: "0px",
          }),
          indicatorSeparator: (baseStyle) => ({
            ...baseStyle,
            width: "0px",
          }),
          container: (baseStyle) => ({
            ...baseStyle,
            height: "46px",
            border: '1px',
            borderColor:"#e5e5e5"
          }),
        }}
        options={options}
        onChange={(newValue) => onChange(newValue?.value)}
      />

     </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
});
