mod error;
mod wallpaper;

use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_single_instance;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    tauri::Builder::default()
        .setup(|app| {
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
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
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
