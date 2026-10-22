//! Native shell shared by desktop and mobile: registers the plugins (files,
//! dialogs, opening encounters:// links, receiving lorekeeper:// links) and
//! starts the Tauri app that hosts the web UI.

#[cfg(desktop)]
use tauri::Manager;

/// Builds and runs the app. On mobile this is the platform entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();
    // Desktop: opening a lorekeeper:// link while the app runs starts a second copy; this hands
    // the link to the running window (via the deep-link plugin) and brings it forward. Must be the
    // first plugin. Android keeps one copy of an app by itself.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }
    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            // Windows: point lorekeeper:// at this executable. Installers register it too; this
            // also covers development builds, and follows the app if it moves.
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Lorekeeper");
}
