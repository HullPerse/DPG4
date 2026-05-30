import { defaultTheme } from "react-admin";
import { createTheme, alpha } from "@mui/material/styles";

export const palette = {
  primary: "#f6c177",
  primaryLight: "#fde4b8",
  primaryDark: "#c9953f",
  accent: "#8b9eff",
  bg: "#090b10",
  surface: "#12151c",
  surfaceRaised: "#1a1f2b",
  surfaceHover: "#222836",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#eceff4",
  textMuted: "#8b93a7",
  success: "#5ee89a",
  error: "#ff7b7b",
} as const;

export const adminTheme = createTheme({
  ...defaultTheme,
  palette: {
    mode: "dark",
    primary: {
      main: palette.primary,
      light: palette.primaryLight,
      dark: palette.primaryDark,
      contrastText: "#14120c",
    },
    secondary: {
      main: palette.accent,
      contrastText: "#0e1018",
    },
    background: {
      default: palette.bg,
      paper: palette.surface,
    },
    text: {
      primary: palette.text,
      secondary: palette.textMuted,
    },
    divider: palette.border,
    success: { main: palette.success },
    error: { main: palette.error },
  },
  typography: {
    fontFamily: '"DM Sans", "Inter", system-ui, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.03em" },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    button: { fontWeight: 600, textTransform: "none" as const },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.bg,
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, ${alpha(palette.primary, 0.14)}, transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, ${alpha(palette.accent, 0.08)}, transparent)
          `,
          backgroundAttachment: "fixed",
        },
        "#main-content": {
          background: "transparent",
        },
        "::-webkit-scrollbar": { width: 8, height: 8 },
        "::-webkit-scrollbar-thumb": {
          background: alpha(palette.text, 0.15),
          borderRadius: 4,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: alpha(palette.surfaceRaised, 0.75),
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${palette.border}`,
          boxShadow: "none",
          color: palette.text,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: palette.surface,
          borderRight: `1px solid ${palette.border}`,
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: palette.surfaceRaised,
          border: `1px solid ${palette.border}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: palette.surfaceRaised,
          border: `1px solid ${palette.border}`,
          transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
          "&:hover": {
            borderColor: alpha(palette.primary, 0.35),
            boxShadow: `0 8px 32px ${alpha("#000", 0.35)}`,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
        containedPrimary: {
          boxShadow: `0 4px 20px ${alpha(palette.primary, 0.3)}`,
          "&:hover": {
            boxShadow: `0 6px 24px ${alpha(palette.primary, 0.4)}`,
          },
        },
        outlined: {
          borderColor: palette.border,
          "&:hover": {
            borderColor: alpha(palette.primary, 0.5),
            background: alpha(palette.primary, 0.06),
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: palette.border,
        },
        head: {
          fontWeight: 600,
          color: palette.textMuted,
          backgroundColor: palette.surface,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: alpha(palette.primary, 0.04),
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(palette.bg, 0.5),
          "&.Mui-focused": {
            backgroundColor: alpha(palette.bg, 0.8),
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: palette.border,
        },
        root: {
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(palette.primary, 0.35),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    RaSidebar: {
      styleOverrides: {
        root: {
          "& .RaSidebar-fixed": {
            background: palette.surface,
          },
        },
      },
    },
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "2px 8px",
          "&.RaMenuItemLink-active": {
            background: alpha(palette.primary, 0.14),
            color: palette.primary,
            "& .MuiSvgIcon-root": {
              color: palette.primary,
            },
          },
          "&:hover": {
            background: alpha(palette.primary, 0.08),
          },
        },
      },
    },
  },
});
