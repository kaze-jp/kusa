mod commands;
mod window_presets;

use std::io::IsTerminal;
use std::path::PathBuf;
use tauri::{Emitter, WebviewWindowBuilder, WebviewUrl, Manager, RunEvent};
use tauri_plugin_cli::CliExt;
use window_presets::{PeekConfig, FULL_SIZE, PEEK_MIN_SIZE, resolve_preset};

/// Determine PeekConfig from CLI args and stdin state.
fn resolve_peek_config(matches: &tauri_plugin_cli::Matches) -> PeekConfig {
    let has_peek_flag = matches
        .args
        .get("peek")
        .map(|a| a.occurrences > 0)
        .unwrap_or(false);

    let has_no_peek_flag = matches
        .args
        .get("no-peek")
        .map(|a| a.occurrences > 0)
        .unwrap_or(false);

    let has_no_focus = matches
        .args
        .get("no-focus")
        .map(|a| a.occurrences > 0)
        .unwrap_or(false);

    let size_preset = matches.args.get("size").and_then(|a| {
        if let serde_json::Value::String(s) = &a.value {
            if !s.is_empty() {
                Some(s.clone())
            } else {
                None
            }
        } else {
            None
        }
    });

    // Determine peek mode:
    // --no-peek always forces full (even if --peek is also present)
    // --peek explicitly enables peek
    // Pipe input (stdin is not terminal) defaults to peek unless --no-peek
    let stdin_is_pipe = !std::io::stdin().is_terminal();

    let is_peek = if has_no_peek_flag {
        false
    } else if has_peek_flag {
        true
    } else if stdin_is_pipe {
        true // pipe input defaults to peek
    } else {
        false
    };

    // Resolve size preset (default depends on mode)
    let default_preset = if is_peek { "peek" } else { "full" };
    let preset_name = size_preset.as_deref().unwrap_or(default_preset);
    // Use a fallback screen size; half preset will use these values
    let size = resolve_preset(preset_name, 1920.0, 1080.0);

    PeekConfig {
        is_peek,
        no_focus: has_no_focus && is_peek, // no-focus only applies in peek mode
        size,
    }
}

/// Create the application window based on peek configuration.
fn create_window(app: &tauri::App, peek_config: &PeekConfig) -> Result<(), Box<dyn std::error::Error>> {
    if peek_config.is_peek {
        // Peek mode: small, no decorations, always on top, transparent for border-radius
        let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
            .title("")
            .inner_size(peek_config.size.width, peek_config.size.height)
            .min_inner_size(PEEK_MIN_SIZE.width, PEEK_MIN_SIZE.height)
            .decorations(false)
            .always_on_top(true)
            .resizable(true)
            .visible(false);

        if peek_config.no_focus {
            builder = builder.focused(false);
        }

        match builder.build() {
            Ok(w) => {
                w.show().ok();
            }
            Err(e) => {
                eprintln!(
                    "Failed to create peek window: {}, falling back to full window",
                    e
                );
                // Fallback: create a full window instead
                let fallback = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                    .title("kusa")
                    .inner_size(FULL_SIZE.width, FULL_SIZE.height)
                    .min_inner_size(400.0, 300.0)
                    .decorations(true)
                    .visible(false)
                    .build()?;
                fallback.show().ok();
                // Emit full mode even though peek was requested (fallback)
                app.emit("window-mode", "full").ok();
                return Ok(());
            }
        }
    } else {
        // Full mode: standard window with decorations
        let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
            .title("kusa")
            .inner_size(peek_config.size.width, peek_config.size.height)
            .min_inner_size(400.0, 300.0)
            .decorations(true)
            .visible(false)
            .build()?;
        window.show().ok();
    }

    Ok(())
}

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
            commands::promote_to_full,
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
            // Parse CLI arguments
            let (file_path, clipboard_flag, peek_config) = if let Ok(matches) = app.cli().matches() {
                let file = matches.args.get("file").and_then(|a| {
                    if let serde_json::Value::String(path) = &a.value {
                        if !path.is_empty() {
                            Some(path.clone())
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                });

                let clipboard = matches
                    .args
                    .get("clipboard")
                    .map(|a| a.value == serde_json::Value::Bool(true))
                    .unwrap_or(false);

                let config = resolve_peek_config(&matches);
                (file, clipboard, config)
            } else {
                (None, false, PeekConfig::default())
            };

            // Emit window mode to frontend
            let mode_str = if peek_config.is_peek { "peek" } else { "full" };
            let _ = app.emit("window-mode", mode_str);

            // Create the window
            if let Err(e) = create_window(app, &peek_config) {
                eprintln!("Fatal: failed to create window: {}", e);
            }

            // Emit CLI args to frontend
            let mut cli_data = serde_json::Map::new();

            if let Some(ref path) = file_path {
                resolve_and_emit(app, path);
                cli_data.insert(
                    "file".to_string(),
                    serde_json::Value::String(path.clone()),
                );
            }

            if clipboard_flag {
                cli_data.insert(
                    "clipboard".to_string(),
                    serde_json::Value::Bool(true),
                );
            }

            let _ = app.emit("cli-args", serde_json::Value::Object(cli_data));

            // No argument: open current directory listing
            if file_path.is_none() {
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
