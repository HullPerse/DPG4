mod error;
mod wallpaper;

use tauri::Emitter;
use tauri::Manager;

fn init_tracing() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tauri_app_lib=debug".into()),
        )
        .try_init();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();

    tauri::Builder::default()
        .setup(|app| {
            tracing::debug!("DPG desktop shell starting");

            let handle = app.handle().clone();
            if let Some(window) = app.get_webview_window("main") {
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(true) = event {
                        let _ = handle.emit("app:focus", ());
                    }
                });
            }

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = window.emit("app:close", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            wallpaper::get_wallpapers,
            wallpaper::get_wallpaper_by_name,
            wallpaper::save_wallpaper,
            wallpaper::delete_wallpaper,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
