import type {
  AccessRequest,
  AccessRequestListResponse,
  DataProduct,
  DataProductCreate,
  DataProductListResponse,
} from "@/types";

const BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  products: {
    list(params?: Record<string, string>) {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<DataProductListResponse>(`/products${qs}`);
    },
    get(id: string) {
      return request<DataProduct>(`/products/${id}`);
    },
    create(data: DataProductCreate) {
      return request<DataProduct>("/products", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(id: string, data: Partial<DataProduct>) {
      return request<DataProduct>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    deprecate(id: string) {
      return request<DataProduct>(`/products/${id}/deprecate`, {
        method: "POST",
      });
    },
  },

  access: {
    list(params?: Record<string, string>) {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<AccessRequestListResponse>(`/access${qs}`);
    },
    create(data: { product_id: string; access_level: string; justification: string }) {
      return request<AccessRequest>("/access", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    decide(id: string, data: { approved: boolean; reason: string }) {
      return request<AccessRequest>(`/access/${id}/approve`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  catalog: {
    catalogs() {
      return request<{ catalogs: unknown[] }>("/catalog/catalogs");
    },
    schemas(catalogName: string) {
      return request<{ schemas: unknown[] }>(
        `/catalog/schemas?catalog_name=${catalogName}`
      );
    },
  },

  health() {
    return request<{ status: string; version: string }>("/health");
  },
};
