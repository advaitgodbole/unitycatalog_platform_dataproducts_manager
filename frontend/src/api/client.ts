import type {
  AccessRequest,
  AccessRequestListResponse,
  AdminUser,
  AdminUserCreate,
  AdminUserListResponse,
  AppSettings,
  AuditLogListResponse,
  CurrentUser,
  DataContract,
  DataContractCreate,
  DataContractListResponse,
  DataProduct,
  DataProductCreate,
  DataProductListResponse,
  PlatformCredential,
  PlatformCredentialCreate,
  PlatformCredentialListResponse,
  SystemOverview,
  TestCredentialResult,
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
  if (res.status === 204) return undefined as T;
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

  contracts: {
    list(productId: string) {
      return request<DataContractListResponse>(
        `/products/${productId}/contracts`
      );
    },
    latest(productId: string) {
      return request<DataContract>(
        `/products/${productId}/contracts/latest`
      );
    },
    create(productId: string, data: DataContractCreate) {
      return request<DataContract>(`/products/${productId}/contracts`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(productId: string, contractId: string, data: Partial<DataContractCreate>) {
      return request<DataContract>(
        `/products/${productId}/contracts/${contractId}`,
        { method: "PUT", body: JSON.stringify(data) }
      );
    },
    activate(productId: string, contractId: string) {
      return request<DataContract>(
        `/products/${productId}/contracts/${contractId}/activate`,
        { method: "POST" }
      );
    },
    exportYaml(productId: string, contractId: string) {
      return fetch(
        `${BASE}/products/${productId}/contracts/${contractId}/export`
      ).then((res) => {
        if (!res.ok) throw new Error(`Export failed: ${res.status}`);
        return res.text();
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

  me() {
    return request<CurrentUser>("/me");
  },

  health() {
    return request<{ status: string; version: string }>("/health");
  },

  admin: {
    credentials: {
      list(params?: Record<string, string>) {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return request<PlatformCredentialListResponse>(`/admin/credentials${qs}`);
      },
      get(id: string) {
        return request<PlatformCredential>(`/admin/credentials/${id}`);
      },
      create(data: PlatformCredentialCreate) {
        return request<PlatformCredential>("/admin/credentials", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      update(id: string, data: Partial<PlatformCredential>) {
        return request<PlatformCredential>(`/admin/credentials/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },
      delete(id: string) {
        return request<void>(`/admin/credentials/${id}`, { method: "DELETE" });
      },
      test(id: string) {
        return request<TestCredentialResult>(`/admin/credentials/${id}/test`, {
          method: "POST",
        });
      },
    },
    users: {
      list(params?: Record<string, string>) {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return request<AdminUserListResponse>(`/admin/users${qs}`);
      },
      create(data: AdminUserCreate) {
        return request<AdminUser>("/admin/users", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      update(id: string, data: { role: string }) {
        return request<AdminUser>(`/admin/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },
      delete(id: string) {
        return request<void>(`/admin/users/${id}`, { method: "DELETE" });
      },
    },
    auditLog(params?: Record<string, string>) {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<AuditLogListResponse>(`/admin/audit-log${qs}`);
    },
    overview() {
      return request<SystemOverview>("/admin/overview");
    },
    settings() {
      return request<AppSettings>("/admin/settings");
    },
  },
};
