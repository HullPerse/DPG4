use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("wallpaper not found: {0}")]
    WallpaperNotFound(String),
    #[error("invalid filename")]
    InvalidFilename,
    #[error("invalid data URL")]
    InvalidDataUrl,
    #[error("file too large: {0} bytes (max {1})")]
    FileTooLarge(usize, usize),
    #[error("cannot delete bundled wallpapers")]
    CannotDeleteDefault,
    #[error("path not allowed")]
    PathNotAllowed,
    #[error("{0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Base64(#[from] base64::DecodeError),
    #[error("image processing failed: {0}")]
    Image(String),
    #[error("{0}")]
    Tauri(#[from] tauri::Error),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type CmdResult<T> = Result<T, AppError>;
