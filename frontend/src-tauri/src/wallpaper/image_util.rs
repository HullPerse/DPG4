use std::io::Cursor;

use image::imageops::FilterType;
use image::{DynamicImage, ImageDecoder, ImageFormat};

use super::MAX_WALLPAPER_BYTES;
use crate::error::{AppError, CmdResult};

const MAX_EDGE: u32 = 1920;
const FAST_PATH_MAX_BYTES: usize = 4 * 1024 * 1024;

pub struct SaveOptions {
    pub prefer_webp: bool,
    /// 1–100 (lossy WebP or JPEG quality hint).
    pub quality: u8,
}

pub struct ProcessedImage {
    pub bytes: Vec<u8>,
    pub file_name: String,
}

fn extension_for_format(format: ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpg",
        ImageFormat::Gif => "gif",
        ImageFormat::WebP => "webp",
        ImageFormat::Bmp => "bmp",
        _ => "jpg",
    }
}

fn dimensions_from_memory(bytes: &[u8]) -> Option<(u32, u32)> {
    let decoder = image::ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .ok()?
        .into_decoder()
        .ok()?;
    let (w, h) = decoder.dimensions();
    Some((w, h))
}

fn resize_if_needed(img: DynamicImage) -> DynamicImage {
    let (w, h) = (img.width(), img.height());
    if w > MAX_EDGE || h > MAX_EDGE {
        img.resize(MAX_EDGE, MAX_EDGE, FilterType::Triangle)
    } else {
        img
    }
}

/// Keep original bytes when already small enough.
fn try_fast_path(bytes: &[u8], stem: &str, force_ext: Option<&str>) -> Option<ProcessedImage> {
    if bytes.len() > FAST_PATH_MAX_BYTES {
        return None;
    }
    let (w, h) = dimensions_from_memory(bytes)?;
    if w > MAX_EDGE || h > MAX_EDGE {
        return None;
    }
    let format = image::guess_format(bytes).ok()?;
    let ext = force_ext.unwrap_or_else(|| extension_for_format(format));
    Some(ProcessedImage {
        bytes: bytes.to_vec(),
        file_name: format!("{stem}.{ext}"),
    })
}

fn encode_as_jpeg(img: DynamicImage, quality: u8) -> CmdResult<Vec<u8>> {
    let thumb = resize_if_needed(img);
    let q = quality.clamp(1, 100);
    let mut buf = Cursor::new(Vec::new());
    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, q);
    thumb
        .write_with_encoder(encoder)
        .map_err(|e| AppError::Image(e.to_string()))?;

    let out = buf.into_inner();
    if out.len() > MAX_WALLPAPER_BYTES {
        return Err(AppError::FileTooLarge(out.len(), MAX_WALLPAPER_BYTES));
    }
    Ok(out)
}

fn encode_as_webp(img: DynamicImage, quality: u8) -> CmdResult<Vec<u8>> {
    let thumb = resize_if_needed(img);
    let q = quality.clamp(1, 100) as f32;
    let memory = webp::Encoder::from_image(&thumb)
        .map_err(|e| AppError::Image(format!("webp encoder: {e}")))?
        .encode(q);
    let out = memory.to_vec();
    if out.len() > MAX_WALLPAPER_BYTES {
        return Err(AppError::FileTooLarge(out.len(), MAX_WALLPAPER_BYTES));
    }
    Ok(out)
}

fn process_as_webp(bytes: &[u8], stem: &str, quality: u8) -> CmdResult<ProcessedImage> {
    if let Some(fast) = try_fast_path(bytes, stem, Some("webp")) {
        if image::guess_format(bytes).ok() == Some(ImageFormat::WebP) {
            return Ok(fast);
        }
    }

    let img = image::load_from_memory(bytes)
        .map_err(|e| AppError::Image(e.to_string()))?;
    let encoded = encode_as_webp(img, quality)?;
    Ok(ProcessedImage {
        file_name: format!("{stem}.webp"),
        bytes: encoded,
    })
}

fn process_as_default(bytes: &[u8], stem: &str, quality: u8) -> CmdResult<ProcessedImage> {
    if let Some(fast) = try_fast_path(bytes, stem, None) {
        return Ok(fast);
    }

    let img = image::load_from_memory(bytes)
        .map_err(|e| AppError::Image(e.to_string()))?;
    let jpeg = encode_as_jpeg(img, quality)?;
    Ok(ProcessedImage {
        file_name: format!("{stem}.jpg"),
        bytes: jpeg,
    })
}

pub fn process_uploaded_image(
    bytes: &[u8],
    stem: &str,
    opts: SaveOptions,
) -> CmdResult<ProcessedImage> {
    if opts.prefer_webp {
        process_as_webp(bytes, stem, opts.quality)
    } else {
        process_as_default(bytes, stem, opts.quality)
    }
}
