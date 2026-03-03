mod commands;

use std::path::PathBuf;
use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_cli::CliExt;

fn resolve_and_emit<R: tauri::Runtime, E: Emitter<R>>(emitter: &E, raw_path: &str) {
    let path = PathBuf::from(raw_path);
    let canonical = match std::fs::canonicalize(&path) {
        Ok(p) => p,
        Err(_) => {
            let _ = emitter.emit("cli-open", raw_path.to_string());
            return;
        }
    };

    if canonical.is_dir() {
        let _ = emitter.emit("cli-open-dir", canonical.to_string_lossy().to_string());
    } else {
        let _ = emitter.emit("cli-open", canonical.to_string_lossy().to_string());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Read stdin before Tauri init (must happen before event loop)
    let stdin_content = commands::read_stdin_if_piped();

    tauri::Builder::default()
        .manage(commands::StdinState {
            content: stdin_content,
        })
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::list_md_files,
            commands::read_stdin,
            commands::read_clipboard,
            commands::fetch_url,
            commands::write_file,
            commands::save_preference,
            commands::load_preference,
        ])
        .plugin(
            tauri_plugin_single_instance::init(|app, args, _cwd| {
                if let Some(path) = args.get(1) {
                    resolve_and_emit(app, path);
                }
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }),
        )
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let mut has_arg = false;

            if let Ok(matches) = app.cli().matches() {
                let mut cli_data = serde_json::Map::new();

                // Check for file argument
                if let Some(file_arg) = matches.args.get("file") {
                    if let serde_json::Value::String(path) = &file_arg.value {
                        if !path.is_empty() {
                            resolve_and_emit(app, path);
                            has_arg = true;
                            cli_data.insert(
                                "file".to_string(),
                                serde_json::Value::String(path.clone()),
                            );
                        }
                    }
                }

                // Check for --clipboard flag
                if let Some(clip_arg) = matches.args.get("clipboard") {
                    if clip_arg.value == serde_json::Value::Bool(true) {
                        cli_data.insert(
                            "clipboard".to_string(),
                            serde_json::Value::Bool(true),
                        );
                    }
                }

                let _ = app.emit("cli-args", serde_json::Value::Object(cli_data));
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
                        let path_str = path.to_string_lossy().to_string();
                        resolve_and_emit(app, &path_str);
                    }
                }
            }
        });
}
