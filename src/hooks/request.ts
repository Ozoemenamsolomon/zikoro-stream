"use client";
import toast from "react-hot-toast";
import { getRequest, patchRequest, postRequest } from "@/utils/api";
import { useEffect, useState } from "react";
import { deleteRequest } from "@/utils/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type RequestStatus = {
  isLoading: boolean;
  error: Error | null;
};

type UseGetResult<TData> = {
  data: TData | undefined;
} & RequestStatus;

type usePostResult<TData, TReturnData = any> = {
  mutateData: ({ payload }: { payload: TData }) => Promise<TReturnData>;
} & RequestStatus;

export const useGetData = <TData>(
  endpoint: string,
  queryKey: string
): UseGetResult<TData> => {
  const getData = async () => {
    try {
      const { data: responseData, status } = await getRequest<TData>({
        endpoint,
      });

      if (status !== 200) {
        throw new Error("Failed to fetch data");
      }

      return responseData.data;
    } catch (error) {
      throw error;
    } finally {
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: getData,
  });

  return {
    data,
    isLoading,
    error,
  };
};

// export const useMutateData = <TData, TReturnData = any>(
//   endpoint: string
// ): usePostResult<TData, TReturnData> => {
//   const [isLoading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<boolean>(false);

//   const mutateData = async ({
//     payload,
//     loadingMessage,
//     confirmationMessage,
//   }: {
//     payload: TData;
//     loadingMessage?: string;
//     confirmationMessage?: string;
//   }) => {
//     try {
//       setLoading(true);
//       toast.success("performing action...");

//       const { data, status } = await patchRequest<TReturnData>({
//         endpoint,
//         payload,
//       });

//       console.log(status);
//       if (status !== 201) {
//         throw data;
//       }

//       toast.success("action performed successfully");

//       return data.data;
//     } catch (error) {
//       setError(true);
//       toast.error("something went wrong");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { isLoading, error, mutateData };
// };

export const usePostRequest = <T>(endpoint: string, queryKey?: string) => {
  const queryClient = useQueryClient();
  const postData = async ({ payload }: { payload: T }) => {
    try {
      const { data, status } = await postRequest<T>({
        endpoint: endpoint,
        payload,
      });

      return data;
    } catch (error: any) {
      //
      throw error;
    } finally {
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: postData,
    onSuccess: () => {
      toast.success("Success");
      if (queryKey) queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error);

      return;
    },
  });

  return { postData: mutate, isLoading: isPending };
};

export const useDeleteRequest = <T>(endpoint: string) => {
  const [isLoading, setLoading] = useState<boolean>(false);

  const deleteData = async (endpointParam?: string) => {
    setLoading(true);

    try {
      const { data, status } = await deleteRequest<T>({
        endpoint: endpointParam || endpoint,
      });

      if (status !== 201) throw data.data;
      toast.error(" Delete successful");

      return data.data;
    } catch (error: any) {
      toast.error(error?.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  return { deleteData, isLoading };
};

type UseFetchResult<TFetchData> = {
  data: TFetchData;
  getData: (param: string) => Promise<TFetchData | undefined>;
} & RequestStatus;

// export const useFetchData = <TFetchData>(
//   endpoint: string,
//   fetchInitial: boolean = true,
//   defaultValue: any = null
// ): UseFetchResult<TFetchData> => {
//   const [data, setData] = useState<TFetchData>(defaultValue);
//   const [isLoading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<boolean>(false);

//   const getData = async (param: string) => {
//     setLoading(true);

//     try {
//       const { data: responseData, status } = await getRequest<TFetchData>({
//         endpoint: `${endpoint}/${param}`,
//       });

//       if (status !== 200) {
//         throw new Error("Failed to fetch data");
//       }
//       setData(responseData.data);

//       return responseData.data;
//     } catch (error) {
//       setError(true);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {
//     data,
//     isLoading,
//     error,
//     getData,
//   };
// };
