import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { loadDefaultCSS } from './constants.js';

export default class WorkspaceOSDPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a settings object
        const settings = this.getSettings();
        
        // Load the default CSS
        const defaultCSS = loadDefaultCSS();

        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'Workspace OSD Settings',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        // General settings group
        const generalGroup = new Adw.PreferencesGroup({
            title: 'General Settings',
        });
        page.add(generalGroup);

        // Show on all monitors setting
        const showOnAllMonitorsRow = new Adw.ActionRow({
            title: 'Show on All Monitors',
            subtitle: 'Display workspace OSD on all connected monitors',
        });
        generalGroup.add(showOnAllMonitorsRow);

        const showOnAllMonitorsSwitch = new Gtk.Switch({
            active: settings.get_boolean('show-on-all-monitors'),
            valign: Gtk.Align.CENTER,
        });
        showOnAllMonitorsRow.add_suffix(showOnAllMonitorsSwitch);
        
        settings.bind(
            'show-on-all-monitors',
            showOnAllMonitorsSwitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // Display duration setting
        const displayDurationRow = new Adw.ActionRow({
            title: 'Display Duration',
            subtitle: 'Time in milliseconds to show the OSD',
        });
        generalGroup.add(displayDurationRow);

        const displayDurationAdjustment = new Gtk.Adjustment({
            lower: 100,
            upper: 10000,
            step_increment: 100,
            page_increment: 1000,
            value: settings.get_int('display-duration'),
        });

        const displayDurationSpinButton = new Gtk.SpinButton({
            adjustment: displayDurationAdjustment,
            numeric: true,
            valign: Gtk.Align.CENTER,
            climb_rate: 100,
            snap_to_ticks: true,
        });
        displayDurationRow.add_suffix(displayDurationSpinButton);
        
        settings.bind(
            'display-duration',
            displayDurationSpinButton,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );

        // Animation duration setting
        const animationDurationRow = new Adw.ActionRow({
            title: 'Animation Duration',
            subtitle: 'Time in milliseconds for fade in/out animations',
        });
        generalGroup.add(animationDurationRow);

        const animationDurationAdjustment = new Gtk.Adjustment({
            lower: 50,
            upper: 1000,
            step_increment: 50,
            page_increment: 100,
            value: settings.get_int('animation-duration'),
        });

        const animationDurationSpinButton = new Gtk.SpinButton({
            adjustment: animationDurationAdjustment,
            numeric: true,
            valign: Gtk.Align.CENTER,
            climb_rate: 50,
            snap_to_ticks: true,
        });
        animationDurationRow.add_suffix(animationDurationSpinButton);
        
        settings.bind(
            'animation-duration',
            animationDurationSpinButton,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );

        // Position group
        const positionGroup = new Adw.PreferencesGroup({
            title: 'Position Settings',
        });
        page.add(positionGroup);

        // Horizontal position
        const positionXRow = new Adw.ActionRow({
            title: 'Horizontal Position',
            subtitle: 'Position as percentage of screen width (0-100%)',
        });
        positionGroup.add(positionXRow);

        // For position, use a horizontal box with a spin button and a label
        const posXBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 5,
            valign: Gtk.Align.CENTER,
        });

        const positionXAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 10,
            // Convert from 0.0-1.0 to 0-100%
            value: Math.round(settings.get_double('position-x') * 100),
        });

        const positionXSpinButton = new Gtk.SpinButton({
            adjustment: positionXAdjustment,
            numeric: true,
            snap_to_ticks: true,
            climb_rate: 1,
            digits: 0,
            width_chars: 3,
        });
        
        // Add a percentage sign label
        const posXLabel = new Gtk.Label({
            label: '%',
            valign: Gtk.Align.CENTER,
        });
        
        posXBox.append(positionXSpinButton);
        posXBox.append(posXLabel);
        positionXRow.add_suffix(posXBox);
        
        // Connect value-changed signal to update settings
        // We need to convert from percentage (0-100) to decimal (0.0-1.0)
        positionXSpinButton.connect('value-changed', () => {
            const percentage = positionXSpinButton.get_value();
            settings.set_double('position-x', percentage / 100);
        });

        // Vertical position
        const positionYRow = new Adw.ActionRow({
            title: 'Vertical Position',
            subtitle: 'Position as percentage of screen height (0-100%)',
        });
        positionGroup.add(positionYRow);

        // For position, use a horizontal box with a spin button and a label
        const posYBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 5,
            valign: Gtk.Align.CENTER,
        });

        const positionYAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 10,
            // Convert from 0.0-1.0 to 0-100%
            value: Math.round(settings.get_double('position-y') * 100),
        });

        const positionYSpinButton = new Gtk.SpinButton({
            adjustment: positionYAdjustment,
            numeric: true,
            snap_to_ticks: true,
            climb_rate: 1,
            digits: 0,
            width_chars: 3,
        });
        
        // Add a percentage sign label
        const posYLabel = new Gtk.Label({
            label: '%',
            valign: Gtk.Align.CENTER,
        });
        
        posYBox.append(positionYSpinButton);
        posYBox.append(posYLabel);
        positionYRow.add_suffix(posYBox);
        
        // Connect value-changed signal to update settings
        // We need to convert from percentage (0-100) to decimal (0.0-1.0)
        positionYSpinButton.connect('value-changed', () => {
            const percentage = positionYSpinButton.get_value();
            settings.set_double('position-y', percentage / 100);
        });

        // Custom CSS group
        const cssGroup = new Adw.PreferencesGroup({
            title: 'Custom CSS',
        });
        page.add(cssGroup);

        // Create a text view for custom CSS input
        const cssFrame = new Gtk.Frame({
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 8,
            margin_end: 8,
        });
        cssGroup.add(cssFrame);

        const cssScrolledWindow = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            min_content_height: 200,
        });
        cssFrame.set_child(cssScrolledWindow);

        const cssBuffer = new Gtk.TextBuffer();
        
        // Check if there's existing custom CSS, if not, use the default
        let customCss = settings.get_string('custom-css');
        if (!customCss || customCss.trim() === '') {
            // Use the CSS directly from file
            customCss = defaultCSS;
        }
        
        cssBuffer.set_text(customCss, -1);
        
        const cssTextView = new Gtk.TextView({
            buffer: cssBuffer,
            monospace: true,
            wrap_mode: Gtk.WrapMode.WORD,
        });
        cssScrolledWindow.set_child(cssTextView);

        // Save button for CSS with immediate effect
        const buttonBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            halign: Gtk.Align.END,
            margin_top: 8,
            margin_bottom: 8,
            margin_end: 8,
        });
        
        const resetButton = new Gtk.Button({
            label: 'Reset to Default',
            valign: Gtk.Align.CENTER,
        });
        
        const saveButton = new Gtk.Button({
            label: 'Save CSS',
            valign: Gtk.Align.CENTER,
        });
        
        buttonBox.append(resetButton);
        buttonBox.append(saveButton);
        cssGroup.add(buttonBox);

        // Reset button - set back to default CSS
        resetButton.connect('clicked', () => {
            // Use the loaded default CSS from file
            cssBuffer.set_text(defaultCSS, -1);
            
            // Save it immediately
            const [start, end] = cssBuffer.get_bounds();
            const css = cssBuffer.get_text(start, end, false);
            settings.set_string('custom-css', css);
        });
        
        // Save button - save the custom CSS
        saveButton.connect('clicked', () => {
            const [start, end] = cssBuffer.get_bounds();
            const css = cssBuffer.get_text(start, end, false);
            settings.set_string('custom-css', css);
        });

        // Preview section
        const previewGroup = new Adw.PreferencesGroup({
            title: 'Preview',
        });
        page.add(previewGroup);
        
        const previewButton = new Gtk.Button({
            label: 'Show OSD Preview',
            halign: Gtk.Align.CENTER,
            margin_top: 8,
            margin_bottom: 16,
        });
        previewGroup.add(previewButton);
        
        previewButton.connect('clicked', () => {
            // First save the current CSS if modified
            const [start, end] = cssBuffer.get_bounds();
            const css = cssBuffer.get_text(start, end, false);
            settings.set_string('custom-css', css);
            
            // Then request the extension to show a preview
            settings.set_boolean('show-preview', true);
        });
    }
} 