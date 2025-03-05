import { get } from "http";
import { getLocaleID, getString } from "../utils/locale";
export class Start {
  static registerPrefs() {
    Zotero.PreferencePanes.register({
      pluginID: addon.data.config.addonID,
      src: rootURI + "content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
    });
  }

  static registerImportToAnythingLLM() {
    // Register a menu item for importing to AnythingLLM
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-import-to-anythingllm",
      label: getString("item-upload2anythingLLM"),
      commandListener: (ev) => {
        const items = Zotero.getActiveZoteroPane().getSelectedItems();
        if (items.length > 0) {
          // 处理选中的条目，准备导入到AnythingLLM
          addon.hooks.onDialogEvents("importToAnythingLLM");
        } else {
          ztoolkit.getGlobal("alert")(getString("item-ask2selectitem"));
        }
      },
    });
  }
}
