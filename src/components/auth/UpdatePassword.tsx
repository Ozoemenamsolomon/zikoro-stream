"use client";

import { useForm } from "react-hook-form";
import { Form, FormField, Input, Button } from "@/components";
import { InputFieldWrapper } from "@/components";
import { useState } from "react";
import { InlineIcon } from "@iconify/react/dist/iconify.js";
import { useUpdatePassword } from "@/hooks";
import { Loader2Icon } from "lucide-react";
import { AuthLayout } from "./_components/AuthLayout";

type FormValue = {
  password: string;
};
export default function UpdatePasswordComp() {
  const [showPassword, setShowPassword] = useState(false);
  const { loading, updatePassword } = useUpdatePassword();
  const form = useForm<FormValue>({});

  async function onSubmit(values: FormValue) {
    await updatePassword(values.password);
  }

  return (
    <AuthLayout>
      <div className="w-full mb-6 flex flex-col items-start justify-start gap-y-1">
        <h2 className="font-medium text-lg sm:text-xl text-start">
          Reset Password
        </h2>
        <p>Enter a new password.</p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-start w-full flex-col gap-y-3"
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <InputFieldWrapper label="New Password">
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
            <span>Reset Password</span>
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
