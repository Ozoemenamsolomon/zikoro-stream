import axios, { AxiosResponse, AxiosError } from "axios";

interface InternalAxiosRequestConfig {
  // Define your Axios request config interface here if needed
}

const Api = axios.create({
  baseURL: "/api",
});

Api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// Define a type for the API response structure
interface ApiResponse<T> {
  data: T;
  error: string | null;
  count: number;
}

// Reusable getRequest function
export const getRequest = async <T>({
  endpoint,
}: {
  endpoint: string;
}): Promise<AxiosResponse<ApiResponse<T>>> => {
  return await Api.get<ApiResponse<T>>(endpoint);
};

export const postRequest = async <T>({
  endpoint,
  payload,
  config,
}: {
  endpoint: string;
  payload: any;
  config?: InternalAxiosRequestConfig;
}): Promise<AxiosResponse<ApiResponse<T>>> => {
  return await Api.post<ApiResponse<T>>(endpoint, payload, config);
};

type RequestOptions<T> = {
  url: string;
  body: T;
  responseType?: 'json' | 'text' | 'blob';
};

export async function PostRequest<T = any, R = any>({
  url,
  body,
  responseType = 'json',
}: RequestOptions<T>): Promise<R> {
  const response = await fetch(url, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
  });

  if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
  }

  switch (responseType) {
      case 'json':
          return response.json() as Promise<R>;
      case 'text':
          return response.text() as Promise<R>;
      case 'blob':
          return response.blob() as Promise<R>;
      default:
          throw new Error('Unsupported response type');
  }
}


export const putRequest = async <T>({
  endpoint,
  payload,
}: {
  endpoint: string;
  payload: any;
}): Promise<AxiosResponse<ApiResponse<T>>> => {
  return await Api.put<ApiResponse<T>>(endpoint, payload);
};

export const patchRequest = async <T>({
  endpoint,
  payload,
}: {
  endpoint: string;
  payload: any;
}): Promise<AxiosResponse<ApiResponse<T>>> => {
  return await Api.patch<ApiResponse<T>>(endpoint, payload);
};

export const deleteRequest = async <T>({
  endpoint,
}: {
  endpoint: string;
}): Promise<AxiosResponse<ApiResponse<T>>> => {
  return await Api.delete<ApiResponse<T>>(endpoint);
};
