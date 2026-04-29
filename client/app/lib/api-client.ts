import axios, { AxiosError } from "axios";
import type { ApiResponse } from "@/types";

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

const getBackendApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
};

// Create axios instance for backend API
const backendAxios = axios.create({
  baseURL: getBackendApiUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add response interceptor to handle 401 errors
backendAxios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      if (typeof window !== "undefined") {
        // Clear localStorage to sync with expired cookie
        localStorage.removeItem("auth-storage");

        // Import dynamically to avoid circular dependency
        import("./auth-store").then(({ useAuthStore }) => {
          const store = useAuthStore.getState();
          store.setUser(null);

          // Only redirect if not already on auth pages
          if (!window.location.pathname.startsWith("/auth/")) {
            window.location.href = "/auth/login";
          }
        });
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Axios-backed fetcher that preserves the existing signature and ApiResponse<T> shape.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    // Merge init headers if provided
    if (init?.headers) {
      const initHeaders = init.headers as Record<string, string>;
      Object.assign(headers, initHeaders);
    }

    const response = await axios.request<ApiResponse<T>>({
      url,
      method: (init?.method as any) ?? "GET",
      data: init?.body ? JSON.parse(init.body as string) : undefined,
      headers,
      withCredentials: true,
      transitional: { silentJSONParsing: false },
      // mimic `cache: "no-store"` semantics; axios ignores fetch cache so noop.
    });

    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data
    ) {
      if (response.data.success === false) {
        return response.data;
      }
      return response.data;
    }

    return { success: false, error: "EMPTY_RESPONSE" } as ApiResponse<T>;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const body = error.response?.data as ApiResponse<T> | undefined;
      if (body?.success === false) return body;
      return {
        success: false,
        error: status ? `HTTP_${status}` : error.message,
      };
    }

    const reason = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return { success: false, error: reason };
  }
}

/**
 * Direct backend API fetcher that calls the backend API directly
 */
export async function backendApiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const url = path.startsWith("http") ? path : `${getBackendApiUrl()}${path}`;

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    // Merge init headers if provided
    if (init?.headers) {
      const initHeaders = init.headers as Record<string, string>;
      Object.assign(headers, initHeaders);
    }

    const response = await backendAxios.request({
      url,
      method: (init?.method as any) ?? "GET",
      data: init?.body ? JSON.parse(init.body as string) : undefined,
      headers,
    });

    // Backend returns data in format: { status: 'success', message: string, data: T }
    // Check for API wrapper: must have status field AND (data or message field)
    if (
      response.data &&
      response.data.status !== undefined &&
      (response.data.data !== undefined || response.data.message !== undefined)
    ) {
      if (response.data.status === "success") {
        return { success: true, data: response.data.data };
      } else {
        return {
          success: false,
          error: response.data.message || "Backend error",
        };
      }
    }

    // If backend doesn't return expected format, wrap the data
    return { success: true, data: response.data };
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const body = error.response?.data;

      if (body && typeof body === "object" && "message" in body) {
        return { success: false, error: body.message as string };
      }

      return {
        success: false,
        error: status ? `HTTP_${status}` : error.message,
      };
    }

    const reason = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return { success: false, error: reason };
  }
}
