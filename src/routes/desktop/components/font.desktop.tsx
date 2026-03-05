import { Combobox } from "@/components/ui/combobox.component";
import { useDataStore, applyFont } from "@/store/data.store";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export default function FontDesktop() {
  const { font, setFont } = useDataStore((state) => state);

  const [fonts, setFonts] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);

    invoke<string>("get_default_font").then((defaultFont) => {
      setSelectedValue(defaultFont);
      setFont(defaultFont);
      setIsInitialized(true);
    });

    invoke<
      {
        name: string;
        path: string;
      }[]
    >("get_all_fonts")
      .then((f) => setFonts(f.map((fo) => fo.name)))
      .finally(() => setTimeout(() => setLoading(false), 1000));
  }, [setFont]);

  const handleFontChange = async (value: string) => {
    setSelectedValue(value);
    setFont(value);
    applyFont(value);
    await invoke("set_default_font", { fontName: value });
  };

  return (
    <div className="absolute right-2 bottom-2">
      <Combobox
        options={fonts.map((f) => {
          return {
            label: f,
            value: f,
            style: { fontFamily: f },
          };
        })}
        value={isInitialized ? selectedValue : ""}
        onChange={handleFontChange}
        placeholder={font || "Выберите шрифт"}
        className="w-64"
        loading={loading}
      />
    </div>
  );
}
