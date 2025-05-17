import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class WorkspaceOSDExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._osd = null;
    this._timeoutId = 0;
  }

  _createOSD(text) {
    if (this._osd) {
      this._osd.destroy();
      this._osd = null;
    }

    // Create the OSD label directly
    this._osd = new St.Label({
      text,
      style_class: 'workspace-osd',
    });

    // Add to the UI group
    Main.uiGroup.add_child(this._osd);
    
    // Get the primary monitor geometry
    const primaryMonitor = Main.layoutManager.primaryMonitor;
    
    // Ensure the label size is allocated before positioning
    this._osd.ensure_style();
    
    // Calculate position based on configured percentages
    const x = primaryMonitor.x + Math.round((primaryMonitor.width - this._osd.width) * 0.5);
    const y = primaryMonitor.y + Math.round((primaryMonitor.height - this._osd.height) * 0.5);
    
    // Position with rounding for pixel alignment
    this._osd.set_position(x, y);

    // Entry animation
    this._osd.opacity = 0;
    this._osd.ease({
      opacity: 255,
      duration: 200,
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
    
    // hide the OSD after 1 second
    this._timeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      1000,
      () => {
        if (this._osd) {
          this._osd.ease({
            opacity: 0,
            duration: 200,
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
    this._signal = global.workspace_manager.connect(
      'active-workspace-changed',
      () => this._showOSD()
    );
  }

  disable() {
    if (this._signal) {
      global.workspace_manager.disconnect(this._signal);
      this._signal = null;
    }
    
    if (this._osd) {
      this._osd.destroy();
      this._osd = null;
    }
    
    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
      this._timeoutId = 0;
    }
  }
}
