/// Window size presets for peek and full modes.
/// Designed for future configuration file support.

#[derive(Debug, Clone, Copy)]
pub struct WindowSize {
    pub width: f64,
    pub height: f64,
}

/// Predefined window size presets
pub const PEEK_SIZE: WindowSize = WindowSize {
    width: 600.0,
    height: 400.0,
};

pub const FULL_SIZE: WindowSize = WindowSize {
    width: 1200.0,
    height: 800.0,
};

pub const PEEK_MIN_SIZE: WindowSize = WindowSize {
    width: 300.0,
    height: 200.0,
};

/// Resolve a named preset to a concrete window size.
/// For the "half" preset, screen dimensions are required.
pub fn resolve_preset(name: &str, screen_width: f64, screen_height: f64) -> WindowSize {
    match name {
        "peek" => PEEK_SIZE,
        "full" => FULL_SIZE,
        "half" => WindowSize {
            width: screen_width * 0.5,
            height: screen_height * 0.75,
        },
        unknown => {
            eprintln!("Warning: unknown size preset '{}', falling back to 'peek'", unknown);
            PEEK_SIZE
        }
    }
}

#[derive(Debug, Clone)]
pub struct PeekConfig {
    pub is_peek: bool,
    pub no_focus: bool,
    pub size: WindowSize,
}

impl Default for PeekConfig {
    fn default() -> Self {
        Self {
            is_peek: false,
            no_focus: false,
            size: FULL_SIZE,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_peek_preset() {
        let size = resolve_preset("peek", 1920.0, 1080.0);
        assert_eq!(size.width, 600.0);
        assert_eq!(size.height, 400.0);
    }

    #[test]
    fn test_resolve_full_preset() {
        let size = resolve_preset("full", 1920.0, 1080.0);
        assert_eq!(size.width, 1200.0);
        assert_eq!(size.height, 800.0);
    }

    #[test]
    fn test_resolve_half_preset() {
        let size = resolve_preset("half", 1920.0, 1080.0);
        assert_eq!(size.width, 960.0);
        assert_eq!(size.height, 810.0);
    }

    #[test]
    fn test_resolve_unknown_preset_falls_back_to_peek() {
        let size = resolve_preset("unknown", 1920.0, 1080.0);
        assert_eq!(size.width, PEEK_SIZE.width);
        assert_eq!(size.height, PEEK_SIZE.height);
    }

    #[test]
    fn test_peek_config_default_is_full_mode() {
        let config = PeekConfig::default();
        assert!(!config.is_peek);
        assert!(!config.no_focus);
        assert_eq!(config.size.width, FULL_SIZE.width);
        assert_eq!(config.size.height, FULL_SIZE.height);
    }
}
