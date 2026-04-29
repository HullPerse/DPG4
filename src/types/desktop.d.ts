export type AppProps = {
  name: string;
  label: string;
  icon: ReactNode;
  link?: string | null;
  type?: "browser" | "window" | undefined;
  component?: ReactNode;
};

export type WallpaperProps = {
  name: string;
  path: string;
};

export type WallpaperFilters = {
  backgroundSize: "cover" | "contain" | "auto" | "fill" | string;
  backgroundPosition: string;
  backgroundRepeat: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
  filter: string;
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  hueRotate: number;
};
