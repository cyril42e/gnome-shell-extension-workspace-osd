import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { loadDefaultCSS } from './constants.js';

export default class WorkspaceOSDExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._osd = null;
    this._timeoutId = 0;
    this._settings = null;
    this._customStyleClass = 'workspace-osd-custom';
    this._styleSheetPath = null;
  }

  _loadSettings() {
    this._settings = this.getSettings();
    
    // Watch for CSS changes to update style immediately if open
    this._settings.connect('changed::custom-css', () => {
      if (this._osd) {
        this._createCustomStylesheet();
      }
    });
  }

  _createCustomStylesheet() {
    // Get the custom CSS from settings
    let customCSS = this._settings.get_string('custom-css');
    
    // If custom CSS is empty, use the default CSS from file
    if (!customCSS || customCSS.trim() === '') {
      customCSS = loadDefaultCSS();
    }
    
    // Unload existing stylesheet if present
    this._removeStylesheet();

    // Create a style element for the custom CSS
    const styleContent = `.${this._customStyleClass} {
${customCSS}
}`;
    
    try {
      // Write to a temporary stylesheet
      const [file, stream] = Gio.File.new_tmp('workspace-osd-XXXXXX.css');
      const path = file.get_path();
      
      // Save the path for cleanup
      this._styleSheetPath = path;
      
      // Write content to the file
      const outputStream = stream.get_output_stream();
      outputStream.write_all(styleContent, null);
      outputStream.close(null);
      
      // Load the stylesheet
      const themeContext = St.ThemeContext.get_for_stage(global.stage);
      if (themeContext && themeContext.get_theme()) {
        const theme = themeContext.get_theme();
        theme.load_stylesheet(path);
        
        // Ensure the theme is updated
        themeContext.set_theme(theme);
        return true;
      }
    } catch (e) {
      logError(e, 'Error creating custom stylesheet');
    }
    
    return false;
  }
  
  _removeStylesheet() {
    if (this._styleSheetPath) {
      try {
        // Unload from theme
        const themeContext = St.ThemeContext.get_for_stage(global.stage);
        if (themeContext && themeContext.get_theme()) {
          themeContext.get_theme().unload_stylesheet(this._styleSheetPath);
        }
        
        // Delete the file
        const file = Gio.File.new_for_path(this._styleSheetPath);
        if (file.query_exists(null)) {
          file.delete(null);
        }
      } catch (e) {
        logError(e, 'Error removing custom stylesheet');
      }
      
      this._styleSheetPath = null;
    }
  }

  _createOSD(text) {
    if (this._osd) {
      this._osd.destroy();
      this._osd = null;
    }

    // Apply custom stylesheet first
    this._createCustomStylesheet();
    
    // Create the OSD label directly with our custom style class
    this._osd = new St.Label({
      text,
      style_class: this._customStyleClass,
    });

    // Add to the UI group
    Main.uiGroup.add_child(this._osd);
    
    // Get the primary monitor geometry
    const primaryMonitor = Main.layoutManager.primaryMonitor;
    
    // Ensure the label size is allocated before positioning
    this._osd.ensure_style();
    
    // Get position settings
    const posX = this._settings.get_double('position-x');
    const posY = this._settings.get_double('position-y');
    
    // Calculate position based on configured percentages
    const x = primaryMonitor.x + Math.round((primaryMonitor.width - this._osd.width) * posX);
    const y = primaryMonitor.y + Math.round((primaryMonitor.height - this._osd.height) * posY);
    
    // Position with rounding for pixel alignment
    this._osd.set_position(x, y);

    // Get animation duration from settings
    const animDuration = this._settings.get_int('animation-duration');

    // Entry animation
    this._osd.opacity = 0;
    this._osd.ease({
      opacity: 255,
      duration: animDuration,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD
    });

    return this._osd;
  }

  _showOSD() {
    const workspaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.preferences' });
    const workspaceNames = workspaceSettings.get_strv('workspace-names')
    const activeWorkspace = global.workspace_manager.get_active_workspace_index();
    const name = workspaceNames[activeWorkspace] || `Workspace ${activeWorkspace + 1}`;

    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
    }

    this._createOSD(name);
    
    // Get display duration from settings
    const displayDuration = this._settings.get_int('display-duration');
    // Get animation duration from settings
    const animDuration = this._settings.get_int('animation-duration');
    
    // Hide the OSD after the configured duration
    this._timeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      displayDuration,
      () => {
        if (this._osd) {
          this._osd.ease({
            opacity: 0,
            duration: animDuration,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
              this._osd.destroy();
              this._osd = null;
            }
          });
        }
        this._timeoutId = 0;
        return GLib.SOURCE_REMOVE;
      }
    );
  }

  enable() {
    this._loadSettings();
    
    // Listen for preview requests
    this._previewChanged = this._settings.connect('changed::show-preview', () => {
      if (this._settings.get_boolean('show-preview')) {
        // Reset the flag immediately
        this._settings.set_boolean('show-preview', false);
        
        // Show a preview OSD
        this._showPreview();
      }
    });
    
    this._signal = global.workspace_manager.connect(
      'active-workspace-changed',
      () => this._showOSD()
    );
  }

  _showPreview() {
    // Simple preview function - show "Preview" as the OSD text
    if (this._osd) {
      this._osd.destroy();
      this._osd = null;
    }
    
    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
      this._timeoutId = 0;
    }
    
    this._createOSD('Preview');
    
    // Get display duration from settings
    const displayDuration = this._settings.get_int('display-duration');
    // Get animation duration from settings
    const animDuration = this._settings.get_int('animation-duration');
    
    // Hide the OSD after the configured duration
    this._timeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      displayDuration,
      () => {
        if (this._osd) {
          this._osd.ease({
            opacity: 0,
            duration: animDuration,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
              this._osd.destroy();
              this._osd = null;
            }
          });
        }
        this._timeoutId = 0;
        return GLib.SOURCE_REMOVE;
      }
    );
  }

  disable() {
    if (this._signal) {
      global.workspace_manager.disconnect(this._signal);
      this._signal = null;
    }
    
    if (this._previewChanged) {
      this._settings.disconnect(this._previewChanged);
      this._previewChanged = null;
    }
    
    if (this._osd) {
      this._osd.destroy();
      this._osd = null;
    }
    
    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
      this._timeoutId = 0;
    }
    
    // Clean up any custom stylesheets
    this._removeStylesheet();
    
    this._settings = null;
  }
}
