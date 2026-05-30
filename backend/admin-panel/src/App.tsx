import {
  Admin,
  Resource,
  List,
  Edit,
  Create,
  Show,
  Datagrid,
  TextField,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  DateTimeInput,
  EditButton,
  ShowButton,
  DeleteButton,
  SimpleShowLayout,
  NumberField,
  BooleanField,
  DateField,
  useRecordContext,
  useResourceContext,
  useInput,
} from "react-admin";
import type { InputProps } from "react-admin";
import { authProvider } from "./authProvider";
import { dataProvider } from "./dataProvider";
import { createTheme } from "@mui/material/styles";
import type { ThemeOptions } from "@mui/material/styles";
import {
  People,
  SportsEsports,
  Bookmark,
  Inventory,
  Storefront,
  Timeline,
  Chat,
  Gavel,
  Campaign,
  Brush,
  GridOn,
} from "@mui/icons-material";
import { useCallback } from "react";

const theme: ThemeOptions = {
  palette: {
    primary: { main: "#2563eb" },
    secondary: { main: "#7c3aed" },
    mode: "light",
    background: { default: "#f1f5f9" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: { fontWeight: 600 },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: "#0f172a", color: "#e2e8f0" },
      },
    },
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: "#0f172a" } },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: "none", borderRadius: 8, fontWeight: 500 } },
    },
    MuiTableCell: {
      styleOverrides: { root: { fontFamily: '"Inter", sans-serif' } },
    },
  },
};

const JsonField: React.FC<{ source: string }> = ({ source }) => {
  const record = useRecordContext();
  if (!record) return null;
  const val = record[source];
  return <span>{val ? JSON.stringify(val).slice(0, 100) : "—"}</span>;
};

const JsonInput: React.FC<{ source: string }> = ({ source }) => (
  <TextInput
    source={source}
    multiline
    helperText="JSON format"
    format={(v: unknown) =>
      v !== null && v !== undefined
        ? typeof v === "string"
          ? v
          : JSON.stringify(v, null, 2)
        : ""
    }
    parse={(v: string) => {
      const t = v.trim();
      if (!t) return null;
      try { return JSON.parse(t); } catch { return v; }
    }}
  />
);

const BlobField: React.FC<{ source: string }> = ({ source }) => {
  const record = useRecordContext();
  const resource = useResourceContext();
  if (!record || !record.id) return <span>—</span>;
  const val = record[source];
  if (!val || typeof val !== "string") return <span>—</span>;
  const url = `/files/${resource}/${record.id}/${source}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
      <img
        src={url}
        alt=""
        style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </a>
  );
};

const BlobInput: React.FC<InputProps & { source: string; label?: string }> = (props) => {
  const { field, fieldState } = useInput(props);
  const record = useRecordContext();
  const resource = useResourceContext();

  const currentUrl = record?.id
    ? `/files/${resource}/${record.id}/${props.source}`
    : null;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        field.onChange(reader.result);
      };
      reader.readAsDataURL(file);
    },
    [field],
  );

  const hasDataUrl = typeof field.value === "string" && field.value.startsWith("data:");

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#374151", fontWeight: 500 }}>
        {props.label ?? props.source}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {hasDataUrl || currentUrl ? (
          <a
            href={hasDataUrl ? field.value : currentUrl!}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={hasDataUrl ? field.value : currentUrl!}
              alt=""
              style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </a>
        ) : (
          <div
            style={{
              width: 64, height: 64, borderRadius: 6, border: "1px dashed #d1d5db",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, color: "#9ca3af",
            }}
          >
            No image
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleChange} />
      </div>
      {fieldState.error && (
        <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{fieldState.error.message}</p>
      )}
    </div>
  );
};

const labels: Record<string, string> = {
  users: "Users",
  games: "Games",
  presets: "Presets",
  items: "Items",
  inventory: "Inventory",
  market: "Market",
  activity: "Activity",
  chats: "Chats",
  rules: "Rules",
  ads: "Ads",
  drawings: "Drawings",
  cells: "Cells",
};

const icons: Record<string, React.ReactNode> = {
  users: <People />,
  games: <SportsEsports />,
  presets: <Bookmark />,
  items: <Inventory />,
  inventory: <Inventory />,
  market: <Storefront />,
  activity: <Timeline />,
  chats: <Chat />,
  rules: <Gavel />,
  ads: <Campaign />,
  drawings: <Brush />,
  cells: <GridOn />,
};

type FieldDef = { source: string; type: string };

const tableFields: Record<string, FieldDef[]> = {
  users: [
    { source: "id", type: "text" },
    { source: "username", type: "text" },
    { source: "email", type: "text" },
    { source: "avatar", type: "text" },
    { source: "color", type: "text" },
    { source: "isAdmin", type: "boolean" },
    { source: "position", type: "number" },
    { source: "money", type: "number" },
    { source: "steam", type: "text" },
    { source: "currentAction", type: "text" },
    { source: "currentDice", type: "number" },
    { source: "status", type: "json" },
    { source: "place", type: "text" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  games: [
    { source: "image", type: "blob" },
    { source: "id", type: "text" },
    { source: "status", type: "text" },
    { source: "score", type: "number" },
    { source: "user", type: "json" },
    { source: "data", type: "json" },
    { source: "playtime", type: "json" },
    { source: "review", type: "json" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  presets: [
    { source: "id", type: "text" },
    { source: "label", type: "text" },
    { source: "games", type: "json" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  items: [
    { source: "image", type: "blob" },
    { source: "id", type: "text" },
    { source: "type", type: "text" },
    { source: "label", type: "text" },
    { source: "description", type: "text" },
    { source: "charge", type: "number" },
    { source: "rollable", type: "boolean" },
    { source: "status", type: "json" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  inventory: [
    { source: "image", type: "blob" },
    { source: "id", type: "text" },
    { source: "type", type: "text" },
    { source: "owner", type: "text" },
    { source: "label", type: "text" },
    { source: "description", type: "text" },
    { source: "charge", type: "number" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  market: [
    { source: "image", type: "blob" },
    { source: "id", type: "text" },
    { source: "type", type: "text" },
    { source: "originalId", type: "text" },
    { source: "label", type: "text" },
    { source: "description", type: "text" },
    { source: "charge", type: "number" },
    { source: "price", type: "number" },
    { source: "discount", type: "number" },
    { source: "owner", type: "json" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  activity: [
    { source: "id", type: "text" },
    { source: "author", type: "text" },
    { source: "image", type: "text" },
    { source: "type", type: "text" },
    { source: "text", type: "text" },
    { source: "created", type: "date" },
  ],
  chats: [
    { source: "image", type: "blob" },
    { source: "id", type: "text" },
    { source: "message", type: "text" },
    { source: "isRead", type: "boolean" },
    { source: "data", type: "json" },
    { source: "created", type: "date" },
  ],
  rules: [
    { source: "id", type: "text" },
    { source: "category", type: "text" },
    { source: "rule", type: "text" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  ads: [
    { source: "image", type: "blob" },
    { source: "id", type: "text" },
    { source: "text", type: "text" },
    { source: "owner", type: "json" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  drawings: [
    { source: "image", type: "blob" },
    { source: "id", type: "text" },
    { source: "author", type: "json" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
  cells: [
    { source: "id", type: "text" },
    { source: "type", type: "text" },
    { source: "number", type: "number" },
    { source: "title", type: "text" },
    { source: "cellType", type: "text" },
    { source: "difficulty", type: "text" },
    { source: "ladderTo", type: "number" },
    { source: "snakeTo", type: "number" },
    { source: "conditions", type: "json" },
    { source: "status", type: "json" },
    { source: "captured", type: "json" },
    { source: "created", type: "date" },
    { source: "updated", type: "date" },
  ],
};

const hiddenTypes = new Set(["mime"]);

function renderInput(field: FieldDef) {
  if (hiddenTypes.has(field.type)) return null;
  if (field.type === "boolean") {
    return <BooleanInput source={field.source} key={field.source} />;
  }
  if (field.type === "number") {
    return <NumberInput source={field.source} key={field.source} fullWidth />;
  }
  if (field.type === "date") {
    return <DateTimeInput source={field.source} key={field.source} />;
  }
  if (field.type === "json") {
    return <JsonInput source={field.source} key={field.source} />;
  }
  if (field.type === "blob") {
    return <BlobInput source={field.source} key={field.source} />;
  }
  return <TextInput source={field.source} key={field.source} fullWidth />;
}

function renderField(field: FieldDef) {
  if (hiddenTypes.has(field.type)) return null;
  if (field.type === "blob") {
    return <BlobField source={field.source} key={field.source} />;
  }
  if (field.type === "boolean") {
    return <BooleanField source={field.source} key={field.source} />;
  }
  if (field.type === "number") {
    return <NumberField source={field.source} key={field.source} />;
  }
  if (field.type === "date") {
    return <DateField source={field.source} key={field.source} showTime />;
  }
  if (field.type === "json") {
    return <JsonField source={field.source} key={field.source} />;
  }
  return <TextField source={field.source} key={field.source} />;
}

const hideInList = new Set(["updated", "imageMime", "audioMime", "passwordHash"]);

function createResource(table: string) {
  const fields = tableFields[table] ?? [];
  const listFields = fields.filter((f) => !hideInList.has(f.source) && !hiddenTypes.has(f.type));

  const ListComponent = () => (
    <List>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        {listFields.map(renderField)}
        <ShowButton />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );

  const ShowComponent = () => (
    <Show>
      <SimpleShowLayout>
        {fields.filter((f) => !hiddenTypes.has(f.type)).map(renderField)}
      </SimpleShowLayout>
    </Show>
  );

  const EditComponent = () => (
    <Edit>
      <SimpleForm>
        {fields.map(renderInput)}
      </SimpleForm>
    </Edit>
  );

  const CreateComponent = () => (
    <Create>
      <SimpleForm>
        {fields.map(renderInput)}
      </SimpleForm>
    </Create>
  );

  return (
    <Resource
      key={table}
      name={table}
      options={{ label: labels[table] ?? table }}
      icon={() => icons[table] ?? null}
      list={ListComponent}
      show={ShowComponent}
      edit={EditComponent}
      create={CreateComponent}
    />
  );
}

const Dashboard = () => (
  <div style={{ padding: 32 }}>
    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>DPG Admin</h1>
    <p style={{ color: "#64748b", fontSize: 15, marginBottom: 32 }}>
      Database management panel. Select a resource from the sidebar.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {Object.entries(labels).map(([key, label]) => (
        <div
          key={key}
          style={{
            padding: 20, borderRadius: 12, background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8, color: "#2563eb" }}>{icons[key]}</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>{label}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{key}</div>
        </div>
      ))}
    </div>
  </div>
);

export function App() {
  return (
    <Admin
      authProvider={authProvider}
      dataProvider={dataProvider}
      dashboard={Dashboard}
      requireAuth
      theme={createTheme(theme)}
    >
      {Object.keys(tableFields).map(createResource)}
    </Admin>
  );
}
