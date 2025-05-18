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
    this._osds = [];
    this._timeoutId = 0;
    this._settings = null;
  }

  _loadSettings() {
    this._settings = this.getSettings();
  }

  _createOSD(text, monitor) {
    // Get CSS from settings or use default
    let customCSS = this._settings.get_string('custom-css');
    if (!customCSS || customCSS.trim() === '') {
      customCSS = loadDefaultCSS();
    }
    
    // Create the OSD label with direct inline style
    const osd = new St.Label({
      text,
      style: customCSS, // Apply CSS directly
    });

    // Add to the UI group
    Main.uiGroup.add_child(osd);
    
    // Ensure the label size is allocated before positioning
    osd.ensure_style();
    
    // Get position settings
    const posX = this._settings.get_double('position-x');
    const posY = this._settings.get_double('position-y');
    
    // Calculate position based on configured percentages for the specific monitor
    const x = monitor.x + Math.round((monitor.width - osd.width) * posX);
    const y = monitor.y + Math.round((monitor.height - osd.height) * posY);
    
    // Position with rounding for pixel alignment
    osd.set_position(x, y);

    // Get animation duration from settings
    const animDuration = this._settings.get_int('animation-duration');

    // Entry animation
    osd.opacity = 0;
    osd.ease({
      opacity: 255,
      duration: animDuration,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD
    });

    return osd;
  }

  _clearOSDs() {
    // Clean up any existing OSDs
    this._osds.forEach(osd => {
      osd.destroy();
    });
    this._osds = [];
  }

  _showOSD() {
    // Get workspace info
    const workspaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.preferences' });
    const workspaceNames = workspaceSettings.get_strv('workspace-names')
    const activeWorkspace = global.workspace_manager.get_active_workspace_index();
    const name = workspaceNames[activeWorkspace] || `Workspace ${activeWorkspace + 1}`;

    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
    }

    // Clear any existing OSDs
    this._clearOSDs();

    // Check if we should show on all monitors
    const showOnAllMonitors = this._settings.get_boolean('show-on-all-monitors');
    
    if (showOnAllMonitors) {
      // Create an OSD for each monitor
      Main.layoutManager.monitors.forEach(monitor => {
        const osd = this._createOSD(name, monitor);
        this._osds.push(osd);
      });
    } else {
      // Only show on primary monitor
      const primaryMonitor = Main.layoutManager.primaryMonitor;
      const osd = this._createOSD(name, primaryMonitor);
      this._osds.push(osd);
    }
    
    // Get display duration from settings
    const displayDuration = this._settings.get_int('display-duration');
    // Get animation duration from settings
    const animDuration = this._settings.get_int('animation-duration');
    
    // Hide the OSDs after the configured duration
    this._timeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      displayDuration,
      () => {
        this._osds.forEach(osd => {
          osd.ease({
            opacity: 0,
            duration: animDuration,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
              osd.destroy();
            }
          });
        });
        this._osds = [];
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
    
    // Listen for CSS changes to update live if the OSD is visible
    this._cssChanged = this._settings.connect('changed::custom-css', () => {
      if (this._osds.length > 0) {
        // Update the style immediately if OSDs are visible
        let customCSS = this._settings.get_string('custom-css');
        if (!customCSS || customCSS.trim() === '') {
          customCSS = loadDefaultCSS();
        }
        this._osds.forEach(osd => {
          osd.set_style(customCSS);
        });
      }
    });
    
    this._signal = global.workspace_manager.connect(
      'active-workspace-changed',
      () => this._showOSD()
    );
  }

  _showPreview() {
    // Clear any existing OSDs
    this._clearOSDs();
    
    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
      this._timeoutId = 0;
    }
    
    // Check if we should show on all monitors
    const showOnAllMonitors = this._settings.get_boolean('show-on-all-monitors');
    
    if (showOnAllMonitors) {
      // Create a preview OSD for each monitor
      Main.layoutManager.monitors.forEach(monitor => {
        const osd = this._createOSD('Preview', monitor);
        this._osds.push(osd);
      });
    } else {
      // Only show on primary monitor
      const primaryMonitor = Main.layoutManager.primaryMonitor;
      const osd = this._createOSD('Preview', primaryMonitor);
      this._osds.push(osd);
    }
    
    // Get display duration from settings
    const displayDuration = this._settings.get_int('display-duration');
    // Get animation duration from settings
    const animDuration = this._settings.get_int('animation-duration');
    
    // Hide the OSD after the configured duration
    this._timeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      displayDuration,
      () => {
        this._osds.forEach(osd => {
          osd.ease({
            opacity: 0,
            duration: animDuration,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
              osd.destroy();
            }
          });
        });
        this._osds = [];
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
    
    if (this._cssChanged) {
      this._settings.disconnect(this._cssChanged);
      this._cssChanged = null;
    }
    
    this._clearOSDs();
    
    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
      this._timeoutId = 0;
    }
    
    this._settings = null;
  }
}
