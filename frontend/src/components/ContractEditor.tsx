import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import type {
  ContractSchemaTable,
  ContractSchemaColumn,
  SLAProperty,
  ServerDefinition,
  CustomProperty,
  AuthoritativeDefinition,
  QualityRule,
  ContractPrice,
  DataContractCreate,
  LogicalType,
} from "@/types";

interface ContractEditorProps {
  initial?: Partial<DataContractCreate>;
  onSave: (data: DataContractCreate) => void;
  saving?: boolean;
}

const LOGICAL_TYPES: LogicalType[] = [
  "string", "integer", "decimal", "boolean", "date", "timestamp", "array", "object",
];

const SLA_PRESETS: SLAProperty[] = [
  { property: "availability", value: "99.9%", unit: "%", description: "Data platform uptime guarantee" },
  { property: "retention", value: "1", unit: "year", description: "Data retention period" },
  { property: "freshness", value: "24", unit: "hours", description: "Maximum data staleness" },
  { property: "support", value: "business hours", description: "Support availability" },
];

const EMPTY_COLUMN: ContractSchemaColumn = {
  name: "", logicalType: "string", physicalType: "TEXT", description: "",
  businessName: "", required: false, primaryKey: false, unique: false,
  classification: null, criticalDataElement: false, examples: [], tags: [],
  quality: [], relationships: [], authoritativeDefinitions: [],
};

const EMPTY_TABLE: ContractSchemaTable = {
  name: "", physicalType: "TABLE", description: "", properties: [], quality: [],
};

const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";
const btnSecondary = "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50";

function Section({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-lg"
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  );
}

function QualityRuleEditor({ rules, onChange }: { rules: QualityRule[]; onChange: (r: QualityRule[]) => void }) {
  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div key={i} className="flex gap-2 items-start bg-gray-50 rounded p-2">
          <div className="flex-1 grid grid-cols-3 gap-2">
            <select
              value={rule.type}
              onChange={(e) => { const n = [...rules]; n[i] = { ...rule, type: e.target.value }; onChange(n); }}
              className={inputClass}
            >
              <option value="text">Text</option>
              <option value="library">Library</option>
            </select>
            <input
              value={rule.metric || ""}
              onChange={(e) => { const n = [...rules]; n[i] = { ...rule, metric: e.target.value }; onChange(n); }}
              className={inputClass}
              placeholder="Metric"
            />
            <input
              value={rule.description}
              onChange={(e) => { const n = [...rules]; n[i] = { ...rule, description: e.target.value }; onChange(n); }}
              className={inputClass}
              placeholder="Description"
            />
          </div>
          <button type="button" onClick={() => onChange(rules.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rules, { type: "text", description: "" }])} className={btnSecondary}>
        <Plus className="w-3 h-3" /> Add Rule
      </button>
    </div>
  );
}

export default function ContractEditor({ initial, onSave, saving }: ContractEditorProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    metadata: true, description: true, schema: false, servers: false, sla: false, pricing: false,
  });

  const [version, setVersion] = useState(initial?.version ?? "1.0.0");
  const [purpose, setPurpose] = useState(initial?.description_purpose ?? "");
  const [usage, setUsage] = useState(initial?.description_usage ?? "");
  const [limitations, setLimitations] = useState(initial?.description_limitations ?? "");
  const [descCustomProps, setDescCustomProps] = useState<CustomProperty[]>(initial?.description_custom_properties ?? []);
  const [descAuthDefs, setDescAuthDefs] = useState<AuthoritativeDefinition[]>(initial?.description_authoritative_definitions ?? []);
  const [tables, setTables] = useState<ContractSchemaTable[]>(initial?.schema_definition ?? []);
  const [servers, setServers] = useState<ServerDefinition[]>(initial?.servers ?? []);
  const [slaProperties, setSlaProperties] = useState<SLAProperty[]>(initial?.sla_properties ?? []);
  const [qualityRules, setQualityRules] = useState<QualityRule[]>(initial?.quality_rules ?? []);
  const [price, setPrice] = useState<ContractPrice>(
    initial?.price ?? { priceAmount: 0, priceCurrency: "USD", priceUnit: "monthly" }
  );
  const [customProps, setCustomProps] = useState<CustomProperty[]>(initial?.custom_properties ?? []);
  const [showYaml, setShowYaml] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  function updateTable(idx: number, patch: Partial<ContractSchemaTable>) {
    setTables((t) => t.map((tb, i) => (i === idx ? { ...tb, ...patch } : tb)));
  }

  function updateColumn(tableIdx: number, colIdx: number, patch: Partial<ContractSchemaColumn>) {
    setTables((t) =>
      t.map((tb, ti) =>
        ti === tableIdx
          ? { ...tb, properties: tb.properties.map((c, ci) => (ci === colIdx ? { ...c, ...patch } : c)) }
          : tb
      )
    );
  }

  function buildPayload(): DataContractCreate {
    return {
      version,
      description_purpose: purpose,
      description_usage: usage,
      description_limitations: limitations,
      description_custom_properties: descCustomProps,
      description_authoritative_definitions: descAuthDefs,
      schema_definition: tables,
      servers,
      sla_properties: slaProperties,
      quality_rules: qualityRules,
      price: price.priceAmount > 0 ? price : undefined,
      custom_properties: customProps,
    };
  }

  function buildYamlPreview(): string {
    const payload = buildPayload();
    const lines: string[] = [
      `apiVersion: v3.1.0`,
      `kind: DataContract`,
      `version: "${payload.version}"`,
      `status: draft`,
    ];
    if (purpose) lines.push(`description:`, `  purpose: "${purpose}"`, usage ? `  usage: "${usage}"` : "", limitations ? `  limitations: "${limitations}"` : "");
    if (tables.length > 0) {
      lines.push(`schema:`);
      for (const t of tables) {
        lines.push(`  - name: ${t.name}`, `    physicalType: ${t.physicalType}`, `    description: "${t.description}"`);
        if (t.properties.length > 0) {
          lines.push(`    properties:`);
          for (const c of t.properties) {
            lines.push(`      - name: ${c.name}`, `        logicalType: ${c.logicalType}`, `        physicalType: ${c.physicalType}`);
            if (c.description) lines.push(`        description: "${c.description}"`);
            if (c.required) lines.push(`        required: true`);
            if (c.primaryKey) lines.push(`        primaryKey: true`);
            if (c.unique) lines.push(`        unique: true`);
            if (c.businessName) lines.push(`        businessName: "${c.businessName}"`);
            if (c.classification) lines.push(`        classification: ${c.classification}`);
            if (c.examples.length > 0) lines.push(`        examples:`, ...c.examples.map((e) => `          - "${e}"`));
          }
        }
      }
    }
    if (slaProperties.length > 0) {
      lines.push(`slaProperties:`);
      for (const s of slaProperties) {
        lines.push(`  - property: ${s.property}`, `    value: "${s.value}"`);
        if (s.unit) lines.push(`    unit: ${s.unit}`);
        if (s.description) lines.push(`    description: "${s.description}"`);
      }
    }
    if (price.priceAmount > 0) {
      lines.push(`price:`, `  priceAmount: ${price.priceAmount}`, `  priceCurrency: ${price.priceCurrency}`, `  priceUnit: ${price.priceUnit}`);
    }
    return lines.filter(Boolean).join("\n");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Data Contract Editor</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowYaml(!showYaml)} className={btnSecondary}>
            <FileText className="w-3.5 h-3.5" /> {showYaml ? "Hide" : "Show"} YAML Preview
          </button>
        </div>
      </div>

      <div className={`grid ${showYaml ? "grid-cols-2 gap-4" : "grid-cols-1"}`}>
        <div className="space-y-3">
          {/* Section 1: Metadata */}
          <Section title="1. Contract Metadata" open={!!openSections.metadata} onToggle={() => toggle("metadata")}>
            <div>
              <label className={labelClass}>Version (semver)</label>
              <input value={version} onChange={(e) => setVersion(e.target.value)} className={inputClass} placeholder="1.0.0" />
            </div>
          </Section>

          {/* Section 2: Description */}
          <Section title="2. Description" open={!!openSections.description} onToggle={() => toggle("description")}>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Purpose</label>
                <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputClass} rows={2} placeholder="What is this data product for?" />
              </div>
              <div>
                <label className={labelClass}>Usage</label>
                <textarea value={usage} onChange={(e) => setUsage(e.target.value)} className={inputClass} rows={2} placeholder="How should consumers use this data?" />
              </div>
              <div>
                <label className={labelClass}>Limitations</label>
                <textarea value={limitations} onChange={(e) => setLimitations(e.target.value)} className={inputClass} rows={2} placeholder="Any known limitations or caveats?" />
              </div>

              <div>
                <label className={labelClass}>Custom Properties</label>
                {descCustomProps.map((cp, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={cp.property} onChange={(e) => { const n = [...descCustomProps]; n[i] = { ...cp, property: e.target.value }; setDescCustomProps(n); }} className={inputClass} placeholder="Property" />
                    <input value={cp.value} onChange={(e) => { const n = [...descCustomProps]; n[i] = { ...cp, value: e.target.value }; setDescCustomProps(n); }} className={inputClass} placeholder="Value" />
                    <input value={cp.description} onChange={(e) => { const n = [...descCustomProps]; n[i] = { ...cp, description: e.target.value }; setDescCustomProps(n); }} className={inputClass} placeholder="Description" />
                    <button type="button" onClick={() => setDescCustomProps(descCustomProps.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setDescCustomProps([...descCustomProps, { property: "", value: "", description: "" }])} className={btnSecondary}><Plus className="w-3 h-3" /> Add Property</button>
              </div>

              <div>
                <label className={labelClass}>Authoritative Definitions</label>
                {descAuthDefs.map((ad, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={ad.url} onChange={(e) => { const n = [...descAuthDefs]; n[i] = { ...ad, url: e.target.value }; setDescAuthDefs(n); }} className={inputClass} placeholder="URL" />
                    <select value={ad.type} onChange={(e) => { const n = [...descAuthDefs]; n[i] = { ...ad, type: e.target.value }; setDescAuthDefs(n); }} className={inputClass}>
                      <option value="businessDefinition">Business Definition</option>
                      <option value="documentation">Documentation</option>
                      <option value="policy">Policy</option>
                      <option value="regulation">Regulation</option>
                    </select>
                    <input value={ad.description} onChange={(e) => { const n = [...descAuthDefs]; n[i] = { ...ad, description: e.target.value }; setDescAuthDefs(n); }} className={inputClass} placeholder="Description" />
                    <button type="button" onClick={() => setDescAuthDefs(descAuthDefs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setDescAuthDefs([...descAuthDefs, { url: "", type: "businessDefinition", description: "" }])} className={btnSecondary}><Plus className="w-3 h-3" /> Add Definition</button>
              </div>
            </div>
          </Section>

          {/* Section 3: Schema */}
          <Section title="3. Schema Definition" open={!!openSections.schema} onToggle={() => toggle("schema")}>
            <div className="space-y-4">
              {tables.map((table, ti) => (
                <div key={ti} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-800">Table {ti + 1}</span>
                    <button type="button" onClick={() => setTables(tables.filter((_, j) => j !== ti))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input value={table.name} onChange={(e) => updateTable(ti, { name: e.target.value })} className={inputClass} placeholder="orders" />
                    </div>
                    <div>
                      <label className={labelClass}>Physical Type</label>
                      <select value={table.physicalType} onChange={(e) => updateTable(ti, { physicalType: e.target.value })} className={inputClass}>
                        <option value="TABLE">TABLE</option>
                        <option value="VIEW">VIEW</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Description</label>
                      <input value={table.description} onChange={(e) => updateTable(ti, { description: e.target.value })} className={inputClass} placeholder="Table description" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-600">Columns</span>
                    {table.properties.map((col, ci) => (
                      <div key={ci} className="border border-gray-200 rounded p-2 bg-white">
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div>
                            <label className={labelClass}>Name</label>
                            <input value={col.name} onChange={(e) => updateColumn(ti, ci, { name: e.target.value })} className={inputClass} placeholder="column_name" />
                          </div>
                          <div>
                            <label className={labelClass}>Logical Type</label>
                            <select value={col.logicalType} onChange={(e) => updateColumn(ti, ci, { logicalType: e.target.value as LogicalType })} className={inputClass}>
                              {LOGICAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Physical Type</label>
                            <input value={col.physicalType} onChange={(e) => updateColumn(ti, ci, { physicalType: e.target.value })} className={inputClass} placeholder="TEXT" />
                          </div>
                          <div>
                            <label className={labelClass}>Business Name</label>
                            <input value={col.businessName} onChange={(e) => updateColumn(ti, ci, { businessName: e.target.value })} className={inputClass} placeholder="Business Name" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className={labelClass}>Description</label>
                            <input value={col.description} onChange={(e) => updateColumn(ti, ci, { description: e.target.value })} className={inputClass} placeholder="Column description" />
                          </div>
                          <div>
                            <label className={labelClass}>Classification</label>
                            <select value={col.classification ?? ""} onChange={(e) => updateColumn(ti, ci, { classification: e.target.value || null })} className={inputClass}>
                              <option value="">None</option>
                              <option value="public">Public</option>
                              <option value="internal">Internal</option>
                              <option value="confidential">Confidential</option>
                              <option value="restricted_phi">Restricted / PHI</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mb-2">
                          {(["required", "primaryKey", "unique", "criticalDataElement"] as const).map((flag) => (
                            <label key={flag} className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                              <input type="checkbox" checked={!!col[flag]} onChange={(e) => updateColumn(ti, ci, { [flag]: e.target.checked })} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                              {flag === "primaryKey" ? "PK" : flag === "criticalDataElement" ? "CDE" : flag}
                            </label>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className={labelClass}>Examples (comma-separated)</label>
                            <input value={col.examples.join(", ")} onChange={(e) => updateColumn(ti, ci, { examples: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className={inputClass} placeholder="value1, value2" />
                          </div>
                          <div>
                            <label className={labelClass}>Tags (comma-separated)</label>
                            <input value={col.tags.join(", ")} onChange={(e) => updateColumn(ti, ci, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className={inputClass} placeholder="pii:true, sensitive" />
                          </div>
                        </div>
                        {/* Relationships */}
                        <div className="mb-2">
                          <label className={labelClass}>Relationships</label>
                          {col.relationships.map((rel, ri) => (
                            <div key={ri} className="flex gap-2 mb-1">
                              <select value={rel.type} onChange={(e) => { const rels = [...col.relationships]; rels[ri] = { ...rel, type: e.target.value }; updateColumn(ti, ci, { relationships: rels }); }} className={inputClass}>
                                <option value="foreignKey">Foreign Key</option>
                              </select>
                              <input value={rel.to} onChange={(e) => { const rels = [...col.relationships]; rels[ri] = { ...rel, to: e.target.value }; updateColumn(ti, ci, { relationships: rels }); }} className={inputClass} placeholder="table.column" />
                              <button type="button" onClick={() => updateColumn(ti, ci, { relationships: col.relationships.filter((_, j) => j !== ri) })} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <button type="button" onClick={() => updateColumn(ti, ci, { relationships: [...col.relationships, { type: "foreignKey", to: "" }] })} className={btnSecondary}><Plus className="w-3 h-3" /> FK</button>
                        </div>
                        {/* Column quality rules */}
                        <div>
                          <label className={labelClass}>Quality Rules</label>
                          <QualityRuleEditor rules={col.quality} onChange={(q) => updateColumn(ti, ci, { quality: q })} />
                        </div>
                        <div className="flex justify-end mt-2">
                          <button type="button" onClick={() => updateTable(ti, { properties: table.properties.filter((_, j) => j !== ci) })} className="text-xs text-red-500 hover:text-red-700">Remove Column</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => updateTable(ti, { properties: [...table.properties, { ...EMPTY_COLUMN }] })} className={btnSecondary}>
                      <Plus className="w-3 h-3" /> Add Column
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className={labelClass}>Table Quality Rules</label>
                    <QualityRuleEditor rules={table.quality} onChange={(q) => updateTable(ti, { quality: q })} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setTables([...tables, { ...EMPTY_TABLE }])} className={btnSecondary}>
                <Plus className="w-3 h-3" /> Add Table
              </button>
            </div>
          </Section>

          {/* Section 4: Servers */}
          <Section title="4. Servers" open={!!openSections.servers} onToggle={() => toggle("servers")}>
            <div className="space-y-3">
              {servers.map((srv, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 p-2 bg-gray-50 rounded-lg">
                  <div>
                    <label className={labelClass}>Server Name</label>
                    <input value={srv.server} onChange={(e) => { const n = [...servers]; n[i] = { ...srv, server: e.target.value }; setServers(n); }} className={inputClass} placeholder="production" />
                  </div>
                  <div>
                    <label className={labelClass}>Environment</label>
                    <select value={srv.environment} onChange={(e) => { const n = [...servers]; n[i] = { ...srv, environment: e.target.value }; setServers(n); }} className={inputClass}>
                      <option value="dev">dev</option>
                      <option value="staging">staging</option>
                      <option value="prod">prod</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <select value={srv.type} onChange={(e) => { const n = [...servers]; n[i] = { ...srv, type: e.target.value }; setServers(n); }} className={inputClass}>
                      <option value="databricks">Databricks</option>
                      <option value="snowflake">Snowflake</option>
                      <option value="postgres">Postgres</option>
                      <option value="glue">AWS Glue</option>
                      <option value="s3">S3</option>
                      <option value="bigquery">BigQuery</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => setServers(servers.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mb-2"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div>
                    <label className={labelClass}>Host</label>
                    <input value={srv.host} onChange={(e) => { const n = [...servers]; n[i] = { ...srv, host: e.target.value }; setServers(n); }} className={inputClass} placeholder="hostname" />
                  </div>
                  <div>
                    <label className={labelClass}>Port</label>
                    <input type="number" value={srv.port ?? ""} onChange={(e) => { const n = [...servers]; n[i] = { ...srv, port: e.target.value ? parseInt(e.target.value) : undefined }; setServers(n); }} className={inputClass} placeholder="5432" />
                  </div>
                  <div>
                    <label className={labelClass}>Database</label>
                    <input value={srv.database} onChange={(e) => { const n = [...servers]; n[i] = { ...srv, database: e.target.value }; setServers(n); }} className={inputClass} placeholder="catalog_name" />
                  </div>
                  <div>
                    <label className={labelClass}>Schema</label>
                    <input value={srv.schema} onChange={(e) => { const n = [...servers]; n[i] = { ...srv, schema: e.target.value }; setServers(n); }} className={inputClass} placeholder="schema_name" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setServers([...servers, { server: "production", environment: "prod", type: "databricks", host: "", database: "", schema: "" }])} className={btnSecondary}>
                <Plus className="w-3 h-3" /> Add Server
              </button>
            </div>
          </Section>

          {/* Section 5: SLA Properties */}
          <Section title="5. SLA Properties" open={!!openSections.sla} onToggle={() => toggle("sla")}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {SLA_PRESETS.map((preset) => (
                  <button
                    key={preset.property}
                    type="button"
                    onClick={() => {
                      if (!slaProperties.find((s) => s.property === preset.property)) {
                        setSlaProperties([...slaProperties, { ...preset }]);
                      }
                    }}
                    className="text-xs px-2 py-1 rounded-full border border-brand-200 text-brand-700 hover:bg-brand-50"
                  >
                    + {preset.property}
                  </button>
                ))}
              </div>
              {slaProperties.map((sla, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-end">
                  <div>
                    <label className={labelClass}>Property</label>
                    <input value={sla.property} onChange={(e) => { const n = [...slaProperties]; n[i] = { ...sla, property: e.target.value }; setSlaProperties(n); }} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Value</label>
                    <input value={sla.value} onChange={(e) => { const n = [...slaProperties]; n[i] = { ...sla, value: e.target.value }; setSlaProperties(n); }} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Unit</label>
                    <input value={sla.unit ?? ""} onChange={(e) => { const n = [...slaProperties]; n[i] = { ...sla, unit: e.target.value }; setSlaProperties(n); }} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <input value={sla.description} onChange={(e) => { const n = [...slaProperties]; n[i] = { ...sla, description: e.target.value }; setSlaProperties(n); }} className={inputClass} />
                  </div>
                  <button type="button" onClick={() => setSlaProperties(slaProperties.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mb-2"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setSlaProperties([...slaProperties, { property: "", value: "", description: "" }])} className={btnSecondary}>
                <Plus className="w-3 h-3" /> Add SLA
              </button>
            </div>
          </Section>

          {/* Section 6: Pricing & Custom Properties */}
          <Section title="6. Pricing & Custom Properties" open={!!openSections.pricing} onToggle={() => toggle("pricing")}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Price Amount</label>
                  <input type="number" value={price.priceAmount} onChange={(e) => setPrice({ ...price, priceAmount: parseFloat(e.target.value) || 0 })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select value={price.priceCurrency} onChange={(e) => setPrice({ ...price, priceCurrency: e.target.value })} className={inputClass}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <select value={price.priceUnit} onChange={(e) => setPrice({ ...price, priceUnit: e.target.value })} className={inputClass}>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="per-query">Per Query</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Custom Properties</label>
                {customProps.map((cp, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={cp.property} onChange={(e) => { const n = [...customProps]; n[i] = { ...cp, property: e.target.value }; setCustomProps(n); }} className={inputClass} placeholder="Property" />
                    <input value={cp.value} onChange={(e) => { const n = [...customProps]; n[i] = { ...cp, value: e.target.value }; setCustomProps(n); }} className={inputClass} placeholder="Value" />
                    <button type="button" onClick={() => setCustomProps(customProps.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setCustomProps([...customProps, { property: "", value: "", description: "" }])} className={btnSecondary}><Plus className="w-3 h-3" /> Add Property</button>
              </div>

              <div>
                <label className={labelClass}>Global Quality Rules</label>
                <QualityRuleEditor rules={qualityRules} onChange={setQualityRules} />
              </div>
            </div>
          </Section>
        </div>

        {showYaml && (
          <div className="sticky top-4">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                <span className="text-xs font-medium text-gray-300">ODCS v3.1.0 YAML Preview</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(buildYamlPreview());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-4 text-xs text-green-400 overflow-auto max-h-[80vh] font-mono whitespace-pre">
                {buildYamlPreview()}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => onSave(buildPayload())}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Contract"}
        </button>
      </div>
    </div>
  );
}
