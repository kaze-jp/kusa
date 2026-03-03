use serde::Serialize;
use std::fs;
use std::time::UNIX_EPOCH;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let canonical = fs::canonicalize(&path)
        .map_err(|e| format!("Cannot resolve path '{}': {}", path, e))?;

    fs::read_to_string(&canonical)
        .map_err(|e| format!("Cannot read file '{}': {}", canonical.display(), e))
}

#[derive(Debug, Serialize)]
pub struct MdFileEntry {
    pub name: String,
    pub path: String,
    pub modified_at: u64,
    pub size: u64,
}

#[tauri::command]
pub fn list_md_files(dir_path: String) -> Result<Vec<MdFileEntry>, String> {
    let canonical = fs::canonicalize(&dir_path)
        .map_err(|e| format!("Cannot resolve directory '{}': {}", dir_path, e))?;

    if !canonical.is_dir() {
        return Err(format!("'{}' is not a directory", canonical.display()));
    }

    let entries = fs::read_dir(&canonical)
        .map_err(|e| format!("Cannot read directory '{}': {}", canonical.display(), e))?;

    let mut files: Vec<MdFileEntry> = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if ext != "md" && ext != "markdown" && ext != "mdx" {
            continue;
        }

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let metadata = entry.metadata().ok();

        let modified_at = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

        files.push(MdFileEntry {
            name,
            path: path.to_string_lossy().to_string(),
            modified_at,
            size,
        });
    }

    files.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));

    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_read_file_success() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.md");
        fs::write(&file_path, "# Hello\nWorld").unwrap();

        let result = read_file(file_path.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "# Hello\nWorld");
    }

    #[test]
    fn test_read_file_not_found() {
        let result = read_file("/nonexistent/path/file.md".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot resolve path"));
    }

    #[test]
    fn test_read_file_non_md() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.txt");
        fs::write(&file_path, "plain text content").unwrap();

        let result = read_file(file_path.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "plain text content");
    }

    #[test]
    fn test_list_md_files_success() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("readme.md"), "# Readme").unwrap();
        fs::write(dir.path().join("notes.markdown"), "# Notes").unwrap();
        fs::write(dir.path().join("page.mdx"), "# Page").unwrap();
        fs::write(dir.path().join("code.rs"), "fn main() {}").unwrap();

        let result = list_md_files(dir.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        let files = result.unwrap();
        assert_eq!(files.len(), 3);
        assert!(files.iter().any(|f| f.name == "readme.md"));
        assert!(files.iter().any(|f| f.name == "notes.markdown"));
        assert!(files.iter().any(|f| f.name == "page.mdx"));
    }

    #[test]
    fn test_list_md_files_empty_dir() {
        let dir = TempDir::new().unwrap();
        let result = list_md_files(dir.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn test_list_md_files_not_found() {
        let result = list_md_files("/nonexistent/directory".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot resolve directory"));
    }
}
