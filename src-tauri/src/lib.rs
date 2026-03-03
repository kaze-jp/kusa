mod commands;

use std::path::PathBuf;
use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_cli::CliExt;

fn resolve_and_emit(app: &tauri::App, raw_path: &str) {
    let path = PathBuf::from(raw_path);
    let canonical = match std::fs::canonicalize(&path) {
        Ok(p) => p,
        Err(_) => {
            // File doesn't exist, still emit as file (frontend will show error)
            let _ = app.emit("cli-open", raw_path.to_string());
            return;
        }
    };

    if canonical.is_dir() {
        let _ = app.emit("cli-open-dir", canonical.to_string_lossy().to_string());
    } else {
        let _ = app.emit("cli-open", canonical.to_string_lossy().to_string());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::list_md_files,
        ])
        .plugin(
            tauri_plugin_single_instance::init(|app, args, _cwd| {
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
            let mut has_arg = false;

            if let Ok(matches) = app.cli().matches() {
                if let Some(file_arg) = matches.args.get("file") {
                    if let serde_json::Value::String(path) = &file_arg.value {
                        if !path.is_empty() {
                            resolve_and_emit(app, path);
                            has_arg = true;
                        }
                    }
                }
            }

            // No argument: open current directory listing
            if !has_arg {
                if let Ok(cwd) = std::env::current_dir() {
                    let _ = app.emit("cli-open-dir", cwd.to_string_lossy().to_string());
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building kusa")
        .run(|app, event| {
            if let RunEvent::Opened { urls } = event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        let _ = app.emit("open-file", path.to_string_lossy().to_string());
                    }
                }
            }
        });
}
