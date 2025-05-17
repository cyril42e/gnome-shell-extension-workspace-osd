UUID = workspace-osd@crteknologies.fr
EXTENSION_PATH = ~/.local/share/gnome-shell/extensions/$(UUID)
SCHEMAS_PATH = $(EXTENSION_PATH)/schemas
BUILD_DIR = build

all: install

compile-schemas:
	glib-compile-schemas --strict schemas

install:
	mkdir -p $(EXTENSION_PATH)
	cp -r extension.js metadata.json prefs.js constants.js default-style.css $(EXTENSION_PATH)
	mkdir -p $(SCHEMAS_PATH)
	cp -r schemas/* $(SCHEMAS_PATH)
	glib-compile-schemas $(SCHEMAS_PATH)

uninstall:
	rm -rf $(EXTENSION_PATH)

zip:
	mkdir -p $(BUILD_DIR)/$(UUID)/schemas
	cp extension.js metadata.json prefs.js constants.js default-style.css $(BUILD_DIR)/$(UUID)/
	cp schemas/*.xml $(BUILD_DIR)/$(UUID)/schemas/
	cd $(BUILD_DIR)/$(UUID)/schemas && glib-compile-schemas .
	cd $(BUILD_DIR) && zip -r $(UUID).zip $(UUID)

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all compile-schemas install uninstall zip clean 