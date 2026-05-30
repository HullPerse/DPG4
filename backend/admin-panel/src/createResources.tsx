import {
  Create,
  Datagrid,
  DeleteButton,
  Edit,
  EditButton,
  Filter,
  List,
  Show,
  ShowButton,
  SimpleForm,
  SimpleShowLayout,
  TextInput,
} from "react-admin";
import { useRecordContext } from "react-admin";
import type { AdminSchema, AdminTableMeta } from "./types";
import { renderField, SmartInput } from "./components/fieldRenderer";
import { JsonField } from "./components/JsonField";
import { ObjectListPreview } from "./components/fieldRenderer";

function EditForm({
  meta,
  isCreate = false,
}: {
  meta: AdminTableMeta;
  isCreate?: boolean;
}) {
  const record = useRecordContext();
  return (
    <SimpleForm>
      {meta.fields.map((f) => (
        <SmartInput
          field={f}
          key={f.source}
          record={record as Record<string, unknown> | undefined}
          isCreate={isCreate}
        />
      ))}
    </SimpleForm>
  );
}

export function createResourceNode(table: string, meta: AdminTableMeta) {
  const listFields = meta.fields.filter(
    (f) =>
      f.type !== "hidden" && f.type !== "password" && !f.hideInList,
  );

  const ListView = () => (
    <List filters={<ListSearchFilter />} perPage={25} sort={{ field: "id", order: "ASC" }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        {listFields.map((f) => {
          if (f.type === "objectList") {
            return <ObjectListPreview source={f.source} key={f.source} />;
          }
          return renderField(f);
        })}
        <ShowButton />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );

  const ShowView = () => (
    <Show>
      <SimpleShowLayout>
        {meta.fields
          .filter((f) => f.type !== "hidden" && f.type !== "password")
          .map((f) =>
            f.type === "json" || f.type === "objectList" ? (
              <JsonField source={f.source} key={f.source} />
            ) : (
              renderField(f)
            ),
          )}
      </SimpleShowLayout>
    </Show>
  );

  const EditView = () => (
    <Edit>
      <EditForm meta={meta} />
    </Edit>
  );

  const CreateView = () => (
    <Create>
      <EditForm meta={meta} isCreate />
    </Create>
  );

  return {
    list: ListView,
    show: ShowView,
    edit: EditView,
    create: CreateView,
  };
}

function ListSearchFilter() {
  return (
    <Filter>
      <TextInput source="q" label="Поиск" alwaysOn resettable />
    </Filter>
  );
}
