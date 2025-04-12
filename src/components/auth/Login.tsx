"use client";

import { useForm } from "react-hook-form";
import { Form, FormField, Input, Button } from "@/components";

import { InputFieldWrapper } from "../InputFieldWrapper";
import { loginSchema } from "@/schemas";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useLogin } from "@/hooks";
import { Loader2Icon } from "lucide-react";

import { AuthLayout } from "./_components/AuthLayout";
import { InlineIcon } from "@iconify/react/dist/iconify.js";

export default function Login({
  redirectedFrom,
}: {
  redirectedFrom: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const { loading, logIn } = useLogin();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    console.log(values, redirectedFrom);
    await logIn(values, redirectedFrom);
  }

  return (
    <AuthLayout>
      <h2 className="font-medium text-lg text-start sm:text-xl mb-6">Welcome back 👋</h2>

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
          <Link href="/forgot-password" className="text-base">
            Forgot Password?
          </Link>
          <Button
            disabled={loading}
            className="mt-4 w-full gap-x-2 hover:bg-opacity-70  h-12 rounded-lg bg-basePrimary text-gray-50 font-medium"
          >
            {loading && <Loader2Icon size={20} className="animate-spin" />}
            <span>Sign In</span>
          </Button>

          <div className="w-full flex items-center gap-x-1 justify-center">
            <p>Don't have an account yet?</p>
            <Link href="/sign-up" className="text-base font-medium">
              Create an account
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
