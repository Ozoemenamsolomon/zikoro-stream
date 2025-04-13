"use client";

import { TOrganization } from "@/types/organization";
import { getRequest } from "@/utils/api";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export function useFetchWorkspace(id: number) {
  const [data, setData] = useState<TOrganization[]>([]);
  const [isLoading, setLoading] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: response, status } = await getRequest<TOrganization[]>({
        endpoint: `/workspace?id=${id}`,
      });

      if (status !== 200) {
        throw new Error(` Error: ${response.error}`);
      }

      setData(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return {
    data: data || [],
    isLoading,

    refetch: fetchData,
  };
}
