mod commands;

use tauri::{Emitter, Manager};
use tauri_plugin_cli::CliExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::list_md_files,
        ])
        .plugin(
            tauri_plugin_single_instance::init(|app, args, _cwd| {
                // Forward file path to existing window
                if let Some(path) = args.get(1) {
                    let _ = app.emit("open-file", path.clone());
                }
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }),
        )
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_cli::init())
        .setup(|app| {
            // Read CLI args and emit to frontend
            if let Ok(matches) = app.cli().matches() {
                if let Some(file_arg) = matches.args.get("file") {
                    if let serde_json::Value::String(path) = &file_arg.value {
                        if !path.is_empty() {
                            let _ = app.emit("cli-open", path.clone());
                        }
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running kusa");
}
