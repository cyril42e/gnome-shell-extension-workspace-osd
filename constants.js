// constants.js - Shared constants for the workspace-osd extension
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

/**
 * Get the extension path depending on the context (prefs.js or extension.js)
 * Should migrate extension.js to use ES modules when possible
 * @returns {string} The extension directory path
 */
function getExtensionPath() {
    // We're in prefs.js context (ES modules)
    if (import.meta && import.meta.url) {
        try {
            const uri = import.meta.url;
            const file = Gio.File.new_for_uri(uri);
            return file.get_parent().get_path();
        } catch (e) {
            console.error(`Error getting path from import.meta.url: ${e}`);
        }
    }
    
    // Fallback to traditional imports approach (extension.js context)
    try {
        const ExtensionUtils = imports.misc.extensionUtils;
        const Me = ExtensionUtils.getCurrentExtension();
        return Me.path;
    } catch (e) {
        console.error(`Error getting extension path: ${e}`);
        return '.'; // Fallback to current directory
    }
}

/**
 * Load default CSS from the extension directory
 * @returns {string} The CSS content as a string
 */
export function loadDefaultCSS() {
    // Get extension path using our helper function
    const extensionPath = getExtensionPath();
    
    // Load from default-style.css in the extension directory
    const cssPath = GLib.build_filenamev([extensionPath, 'default-style.css']);
    const file = Gio.File.new_for_path(cssPath);
    
    const [success, contents] = file.load_contents(null);
    
    // Convert the file contents to string
    return new TextDecoder().decode(contents);
} 
