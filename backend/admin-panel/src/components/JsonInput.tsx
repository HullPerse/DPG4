import { useEffect, useState } from "react";
import MuiTextField from "@mui/material/TextField";
import { useInput } from "react-admin";
import {
  formatAlignedJsonText,
  parseJsonOrAligned,
  validateJsonText,
} from "../jsonAlign";

export function JsonInput({ source, label }: { source: string; label?: string }) {
  const { field, fieldState, isRequired } = useInput({ source });
  const [text, setText] = useState(() => formatAlignedJsonText(field.value));
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setText(formatAlignedJsonText(field.value));
    setParseError(null);
  }, [field.value]);

  return (
    <MuiTextField
      label={label ?? source}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const err = validateJsonText(next);
        setParseError(err);
        if (!err) field.onChange(parseJsonOrAligned(next));
      }}
      onBlur={() => {
        const err = validateJsonText(text);
        setParseError(err);
        if (!err) {
          field.onChange(parseJsonOrAligned(text));
          setText(formatAlignedJsonText(field.value));
        }
        field.onBlur();
      }}
      name={field.name}
      inputRef={field.ref}
      required={isRequired}
      multiline
      minRows={8}
      fullWidth
      margin="normal"
      error={!!fieldState.error || !!parseError}
      helperText={
        fieldState.error?.message ??
        parseError ??
        "JSON. Клик вне поля — выравнивание ключей."
      }
      slotProps={{
        input: {
          sx: {
            fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.5,
          },
        },
      }}
    />
  );
}
