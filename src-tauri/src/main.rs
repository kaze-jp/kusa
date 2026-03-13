// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Handle --version / -V before anything else (works in both debug and release)
    {
        let args: Vec<String> = std::env::args().collect();
        if args.iter().any(|a| a == "--version" || a == "-V") {
            println!("kusa {}", env!("CARGO_PKG_VERSION"));
            return;
        }
    }

    // In release builds on macOS, if launched from a terminal (not via `open`),
    // relaunch via `open` so the CLI returns immediately.
    // Piped stdin (e.g. `cat file | kusa`) is NOT a terminal, so it goes through normally.
    #[cfg(all(not(debug_assertions), target_os = "macos"))]
    {
        use std::io::IsTerminal;
        if std::io::stdin().is_terminal() {
            if let Ok(exe) = std::env::current_exe() {
                let exe_str = exe.to_string_lossy().to_string();
                if let Some(app_idx) = exe_str.find(".app/") {
                    let app_path = &exe_str[..app_idx + 4];
                    let args: Vec<String> = std::env::args().skip(1).collect();

                    // Resolve relative file paths to absolute before relaunching
                    let resolved_args: Vec<String> = args
                        .iter()
                        .map(|arg| {
                            if !arg.starts_with('-') {
                                let p = std::path::Path::new(arg);
                                if p.exists() {
                                    if let Ok(abs) = std::fs::canonicalize(p) {
                                        return abs.to_string_lossy().to_string();
                                    }
                                }
                            }
                            arg.clone()
                        })
                        .collect();

                    let mut cmd = std::process::Command::new("open");
                    cmd.arg("-a").arg(app_path);
                    if !resolved_args.is_empty() {
                        cmd.arg("--args");
                        cmd.args(&resolved_args);
                    }
                    let _ = cmd.spawn();
                    return;
                }
            }
        }
    }
    kusa_lib::run()
}
