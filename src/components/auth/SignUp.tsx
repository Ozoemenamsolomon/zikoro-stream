"use client";

import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  Input,
  Button,
  InputFieldWrapper,
} from "@/components";
import { loginSchema } from "@/schemas";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useRegistration } from "@/hooks";
import { Loader2Icon } from "lucide-react";
import { AuthLayout } from "./_components/AuthLayout";
import { InlineIcon } from "@iconify/react/dist/iconify.js";

export default function SignUp({ emailParam }: { emailParam: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const { loading, register } = useRegistration({});

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: emailParam || "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    await register(values);
  }

  return (
    <AuthLayout>
      <h2 className="font-medium text-lg sm:text-xl mb-6 text-start w-full">
        Sign Up
      </h2>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-start w-full flex-col gap-y-3"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <InputFieldWrapper label="Email">
                <Input
                  type="email"
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
                <div className="relative h-12 w-full">
                  <Input
                    placeholder="Enter Password"
                    type={showPassword ? "text" : "password"}
                    {...field}
                    className=" placeholder:text-sm h-11 text-gray-700"
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
            className="mt-4 w-full gap-x-2 hover:bg-opacity-70 bg-basePrimary h-11 rounded-lg text-gray-50 font-medium"
          >
            {loading && <Loader2Icon size={20} className="animate-spin" />}
            <span>Sign Up</span>
          </Button>

          <div className="w-full flex items-center gap-x-1 justify-center">
            <p>Already have an account?</p>
            <Link href="/" className="text-base font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
