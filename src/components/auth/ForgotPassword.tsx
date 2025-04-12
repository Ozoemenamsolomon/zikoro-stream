"use client";

import { useForm } from "react-hook-form";
import { Form, FormField, Input, Button } from "@/components";
import { InputFieldWrapper } from "@/components";
import { useForgotPassword } from "@/hooks";
import { Loader2Icon } from "lucide-react";
import { AuthLayout } from "./_components/AuthLayout";

type FormValue = {
  email: string;
};
export default function ForgotPasswordComp() {
  const { loading, forgotPassword } = useForgotPassword();
  const form = useForm<FormValue>({});

  async function onSubmit(values: FormValue) {
    await forgotPassword(values.email);
  }

  return (
    <AuthLayout>
      <div className="w-full mb-6 flex flex-col items-start justify-start gap-y-1">
        <h2 className="font-medium text-lg sm:text-xl text-start">
          Forgot Password
        </h2>
        <p>Enter the email you used for registration.</p>
      </div>

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

          <Button
            disabled={loading}
            className="mt-4 w-full gap-x-2 hover:bg-opacity-70 bg-basePrimary h-11 rounded-md text-gray-50 font-medium"
          >
            {loading && <Loader2Icon size={20} className="animate-spin" />}
            <span>Submit</span>
          </Button>
        </form>
      </Form>
      </AuthLayout>
  );
}
