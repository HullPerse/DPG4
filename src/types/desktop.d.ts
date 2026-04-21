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
