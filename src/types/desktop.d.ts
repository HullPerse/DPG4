export type AppProps = {
  name: string;
  label: string;
  icon: ReactNode;
  link?: string | null;
  component?: ReactNode;
};

export type WallpaperProps = {
  name: string;
  path: string;
};
