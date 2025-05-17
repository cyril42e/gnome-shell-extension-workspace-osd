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

    // create a full screen container
    this._osd = new St.Bin({
      layout_manager: new Clutter.BinLayout(),
      x_expand: true,
      y_expand: true,
      x: 0,
      y: 0,
      width: global.screen_width,
      height: global.screen_height
    });

    // centered text
    const label = new St.Label({
      text,
      style_class: 'workspace-osd',
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER
    });

    this._osd.set_child(label);
    Main.uiGroup.add_child(this._osd);

    // entry animation
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
