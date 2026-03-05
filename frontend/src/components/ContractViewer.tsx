import { useState } from "react";
import {
  Download,
  Edit3,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Shield,
  Database,
  DollarSign,
  Loader2,
} from "lucide-react";
import type { DataContract, DataProduct } from "@/types";

interface ContractViewerProps {
  contract: DataContract;
  product: DataProduct;
  onEdit?: () => void;
  onNewVersion?: () => void;
  onActivate?: () => void;
  onExport?: () => void;
  activating?: boolean;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "draft":
      return <Clock className="w-4 h-4 text-amber-500" />;
    case "deprecated":
      return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    default:
      return null;
  }
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

export default function ContractViewer({
  contract,
  product,
  onEdit,
  onNewVersion,
  onActivate,
  onExport,
  activating,
}: ContractViewerProps) {
  const [expandedTables, setExpandedTables] = useState<Record<number, boolean>>({});

  const toggleTable = (idx: number) =>
    setExpandedTables((s) => ({ ...s, [idx]: !s[idx] }));

  const statusColor =
    contract.status === "active" ? "green" : contract.status === "draft" ? "amber" : "gray";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Data Contract</h3>
          <Badge color={statusColor}>
            <StatusIcon status={contract.status} />
            {contract.status}
          </Badge>
          <Badge color="blue">v{contract.version}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {contract.status === "draft" && onActivate && (
            <button
              onClick={onActivate}
              disabled={activating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {activating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Activate
            </button>
          )}
          {contract.status === "draft" && onEdit && (
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          )}
          {contract.status === "active" && onNewVersion && (
            <button onClick={onNewVersion} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Plus className="w-3 h-3" /> New Version
            </button>
          )}
          {onExport && (
            <button onClick={onExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Download className="w-3 h-3" /> Export YAML
            </button>
          )}
        </div>
      </div>

      {/* Auto-derived info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Auto-derived from Product</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-blue-600">Team</span>
            <p className="font-medium text-blue-900 capitalize">{product.owning_domain}</p>
          </div>
          <div>
            <span className="text-blue-600">Owner</span>
            <p className="font-medium text-blue-900">{product.data_steward_email}</p>
          </div>
          <div>
            <span className="text-blue-600">Roles</span>
            <p className="font-medium text-blue-900">{product.name}_read, {product.name}_write</p>
          </div>
          <div>
            <span className="text-blue-600">Tags</span>
            <p className="font-medium text-blue-900">{product.owning_domain}, {product.classification}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {(contract.description_purpose || contract.description_usage || contract.description_limitations) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Description</h4>
          <div className="space-y-2 text-sm text-gray-700">
            {contract.description_purpose && (
              <div><span className="font-medium text-gray-500">Purpose:</span> {contract.description_purpose}</div>
            )}
            {contract.description_usage && (
              <div><span className="font-medium text-gray-500">Usage:</span> {contract.description_usage}</div>
            )}
            {contract.description_limitations && (
              <div><span className="font-medium text-gray-500">Limitations:</span> {contract.description_limitations}</div>
            )}
          </div>
          {contract.description_authoritative_definitions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-500">Authoritative Definitions</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {contract.description_authoritative_definitions.map((ad, i) => (
                  <a key={i} href={ad.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {ad.description || ad.type}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schema Definition */}
      {contract.schema_definition.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-400" /> Schema
          </h4>
          <div className="space-y-3">
            {contract.schema_definition.map((table, ti) => (
              <div key={ti} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleTable(ti)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Badge color="purple">{table.physicalType}</Badge>
                    <span className="text-sm font-medium text-gray-900 font-mono">{table.name}</span>
                    <span className="text-xs text-gray-500">({table.properties.length} columns)</span>
                  </div>
                </button>
                {(expandedTables[ti] ?? true) && (
                  <div className="overflow-x-auto">
                    {table.description && (
                      <p className="px-4 py-2 text-xs text-gray-600 bg-gray-50/50 border-b border-gray-100">
                        {table.description}
                      </p>
                    )}
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Column</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Type</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Physical</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Constraints</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.properties.map((col, ci) => (
                          <tr key={ci} className="border-b border-gray-100 hover:bg-gray-50/50">
                            <td className="px-3 py-2">
                              <span className="font-mono font-medium text-gray-900">{col.name}</span>
                              {col.businessName && (
                                <span className="ml-1 text-gray-400">({col.businessName})</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-700">{col.logicalType}</td>
                            <td className="px-3 py-2 font-mono text-gray-500">{col.physicalType}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {col.primaryKey && <Badge color="purple">PK</Badge>}
                                {col.required && <Badge color="amber">required</Badge>}
                                {col.unique && <Badge color="blue">unique</Badge>}
                                {col.criticalDataElement && <Badge color="green">CDE</Badge>}
                                {col.classification && <Badge color="gray">{col.classification}</Badge>}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{col.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {table.quality.length > 0 && (
                      <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                        <span className="text-xs font-medium text-amber-700">Table Quality Rules:</span>
                        {table.quality.map((q, qi) => (
                          <span key={qi} className="ml-2 text-xs text-amber-600">{q.description}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Servers */}
      {contract.servers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Servers</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contract.servers.map((srv, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{srv.server}</span>
                  <Badge color="blue">{srv.environment}</Badge>
                  <Badge color="gray">{srv.type}</Badge>
                </div>
                {srv.host && <div><span className="text-gray-500">Host:</span> {srv.host}{srv.port ? `:${srv.port}` : ""}</div>}
                {srv.database && <div><span className="text-gray-500">DB:</span> {srv.database}{srv.schema ? `.${srv.schema}` : ""}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLA Properties */}
      {contract.sla_properties.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" /> SLA Properties
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {contract.sla_properties.map((sla, i) => (
              <div key={i} className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-xl font-bold text-green-800">
                  {sla.value}{sla.unit && sla.unit !== "%" ? ` ${sla.unit}` : ""}
                </div>
                <div className="text-xs font-medium text-green-700 capitalize mt-1">{sla.property}</div>
                {sla.description && (
                  <div className="text-xs text-green-600 mt-0.5">{sla.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price */}
      {contract.price && contract.price.priceAmount > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" /> Pricing
          </h4>
          <div className="text-2xl font-bold text-gray-900">
            {contract.price.priceCurrency} {contract.price.priceAmount}
            <span className="text-sm font-normal text-gray-500 ml-1">/ {contract.price.priceUnit}</span>
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-400 flex items-center gap-4">
        <span>Created by {contract.created_by}</span>
        <span>Created {new Date(contract.created_at).toLocaleDateString()}</span>
        <span>Updated {new Date(contract.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
