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

    // In release builds on macOS, relaunch via `open` so the CLI returns immediately.
    // Uses a hidden --launched flag to prevent infinite relaunch loops:
    //   - First invocation (from terminal): no flag → relaunch via `open -a` → return
    //   - Second invocation (via `open`): --launched present → skip relaunch → run app
    // Piped stdin (e.g. `cat file | kusa`) is NOT a terminal, so it runs directly.
    #[cfg(all(not(debug_assertions), target_os = "macos"))]
    {
        let args: Vec<String> = std::env::args().collect();
        let already_launched = args.iter().any(|a| a == "--launched");

        // Check if stdin is a pipe (actual piped content like `cat file | kusa`).
        // /dev/null and terminals are NOT pipes, so we detach in both cases.
        let stdin_is_pipe = {
            use std::os::unix::io::AsRawFd;
            unsafe {
                let mut stat: libc::stat = std::mem::zeroed();
                if libc::fstat(std::io::stdin().as_raw_fd(), &mut stat) == 0 {
                    (stat.st_mode & libc::S_IFMT) == libc::S_IFIFO
                } else {
                    false
                }
            }
        };

        if !already_launched && !stdin_is_pipe {
            if let Ok(exe) = std::env::current_exe() {
                let exe_str = exe.to_string_lossy().to_string();
                if let Some(app_idx) = exe_str.find(".app/") {
                    let app_path = &exe_str[..app_idx + 4];
                    // Collect user args (skip program name), exclude internal flags
                    let user_args: Vec<String> = args
                        .iter()
                        .skip(1)
                        .filter(|a| a.as_str() != "--launched")
                        .cloned()
                        .collect();

                    // Resolve relative file paths to absolute before relaunching.
                    // `open -a` changes cwd, so relative paths must be resolved here.
                    let cwd = std::env::current_dir().ok();
                    let resolved_args: Vec<String> = user_args
                        .iter()
                        .map(|arg| {
                            if !arg.starts_with('-') {
                                let p = std::path::Path::new(arg);
                                // Already absolute — just canonicalize if possible
                                if p.is_absolute() {
                                    return std::fs::canonicalize(p)
                                        .map(|a| a.to_string_lossy().to_string())
                                        .unwrap_or_else(|_| arg.clone());
                                }
                                // Relative path — resolve against cwd
                                if let Some(ref cwd) = cwd {
                                    let abs = cwd.join(p);
                                    // Use canonicalize if the file exists, otherwise keep the joined path
                                    return std::fs::canonicalize(&abs)
                                        .unwrap_or(abs)
                                        .to_string_lossy()
                                        .to_string();
                                }
                            }
                            arg.clone()
                        })
                        .collect();

                    let mut cmd = std::process::Command::new("open");
                    cmd.arg("-a").arg(app_path).arg("--args");
                    cmd.arg("--launched");
                    cmd.args(&resolved_args);
                    let _ = cmd.spawn();
                    return;
                }
            }
        }
    }
    kusa_lib::run()
}
