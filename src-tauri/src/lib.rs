//! Native shell shared by desktop and mobile: registers the file-system and
//! dialog plugins and starts the Tauri app that hosts the web UI.

/// Builds and runs the app. On mobile this is the platform entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running Lorekeeper");
}
