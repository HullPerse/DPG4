import { useCallback, useEffect, useRef, useState } from "react";

interface UseFileUploadOptions {
  acceptPrefix: string;
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string;
}

export function useFileUpload({ acceptPrefix, value, onChange, existingUrl }: UseFileUploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (existingUrl) {
      setObjectUrl(existingUrl);
    } else {
      setObjectUrl(null);
    }
  }, [value, existingUrl]);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith(acceptPrefix)) {
        return;
      }
      onChange(file);
    },
    [acceptPrefix, onChange],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile],
  );

  const clear = useCallback(() => {
    onChange(null);
    setObjectUrl(null);
  }, [onChange]);

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return {
    inputRef,
    objectUrl,
    handleFileSelect,
    clear,
    openFileDialog,
  };
}
