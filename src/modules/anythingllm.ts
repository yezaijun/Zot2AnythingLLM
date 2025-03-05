/**
 * AnythingLLM集成模块
 * 用于处理Zotero条目到AnythingLLM的导入
 */
import { getString, initLocale } from "../utils/locale";
import { config } from "../../package.json";
import "formdata-polyfill";

interface ZoteroAttachment {
  id: number;
  filename: string;
  contentType: string;
  path: string;
}

export class AnythingLLMIntegration {
  /**
   * 获取url和token
   * @returns {url: string, token: string}
   */
  static async getUrlAndToken() {
    const url = Zotero.Prefs.get(
      `${config.prefsPrefix}.AnythingLLM.url`,
      true,
    ) as string;
    const token = Zotero.Prefs.get(
      `${config.prefsPrefix}.AnythingLLM.apitoken`,
      true,
    ) as string;
    return { url, token };
  }

  static async VerifyConnection() {
    const URLandToken = await this.getUrlAndToken();
    if (!URLandToken.url || !URLandToken.token) {
      return {
        status: false,
        message: "Need config url and token.",
      };
    }

    try {
      const response = await fetch(
        `${URLandToken.url.replace(/\/?$/, "/")}api/v1/auth`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${URLandToken.token}`,
            Accept: "application/json",
          },
        },
      );

      interface AuthResponse {
        authenticated?: boolean;
      }

      const data: AuthResponse | null = response.ok
        ? ((await response.json()) as AuthResponse)
        : null;

      if (data?.authenticated) {
        Zotero.Prefs.set(`${config.prefsPrefix}.AnythingLLM.verified`, true);
        return {
          status: true,
          message: "Verify success",
        };
      } else {
        Zotero.Prefs.set(`${config.prefsPrefix}.AnythingLLM.verified`, false);
        return {
          status: false,
          message: `Verify failed: ${response.statusText}`,
        };
      }
    } catch (error) {
      Zotero.debug(`[Zot2AnythingLLM]-Verify failed: ${error}`);
      return {
        status: false,
        message: `Verify failed: ${error}`,
      };
    }
  }

  /**
   * 验证AnythingLLM连接
   * @returns Promise<boolean>
   */
  static async WindowVerifyConnection(window: Window) {
    const output = await this.VerifyConnection();
    if (!output.status) {
      window.alert(output.message);
    }

    if (output.status) {
      const statusElement = window.document.getElementById(
        `zotero-prefpane-${config.addonRef}-verify-status`,
      );
      if (statusElement) {
        statusElement.textContent = "✅";
        statusElement.setAttribute("data-verified", "true");
      }
    } else {
      const statusElement = window.document.getElementById(
        `zotero-prefpane-${config.addonRef}-verify-status`,
      );
      if (statusElement) {
        statusElement.textContent = "❌";
        statusElement.setAttribute("data-verified", "false");
      }
    }
  }

  /**
   * 上传文件到AnythingLLM
   * @param attachment Zotero附件对象
   * @param URLandToken URL和Token信息
   * @returns 上传响应
   */
  private static async uploadFile(
    attachment: ZoteroAttachment,
    URLandToken: { url: string; token: string },
  ) {
    try {
      // 创建一个 FormData 对象
      const formData = new FormData();
      await fetch(`file://${attachment.path}`)
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
          const blob = new Blob([buffer], { type: "application/octet-stream" });
          formData.append("file", blob, attachment.path);
        })
        .catch((error) => Zotero.debug("Error fetching the file:", error));

      const response = await fetch(
        `${URLandToken.url.replace(/\/?$/, "/")}api/v1/document/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${URLandToken.token}`,
            accept: "application/json",
          },
          body: formData,
        },
      );

      if (response.ok) {
        return true;
      } else {
        throw new Error(
          `Upload failed with status ${response.status}, response: ${response.statusText}`,
        );
      }
    } catch (error) {
      Zotero.debug(`Upload failed: ${error}`);
      return false;
    }
  }

  /**
   * 导入条目到AnythingLLM
   * @param items Zotero条目数组
   */
  static async importItems(items: Zotero.Item[]) {
    const output = await this.VerifyConnection();

    if (!output.status) {
      Zotero.debug(`[Zot2AnythingLLM]-Not verified, skip import`);
      const ErrorpopupWin = new ztoolkit.ProgressWindow(
        addon.data.config.addonName,
        {
          closeOnClick: true,
          closeTime: -1,
        },
      )
        .createLine({
          text: getString("notVerifed"),
          type: "default",
          progress: 0,
        })
        .show();
      return;
    } else {
      Zotero.debug(`[Zot2AnythingLLM]-Verified, start import`);
    }
    const URLandToken = await this.getUrlAndToken();

    const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: true,
      closeTime: -1,
    })
      .createLine({
        text: "Uploading files to AnythingLLM",
        type: "default",
        progress: 0,
      })
      .show();

    // 统计失败的文件
    const failedFiles: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const attachments = await this.getItemAttachments(items[i]);
      // 上传文件到AnythingLLM
      for (const attachment of attachments) {
        const responseOK = await this.uploadFile(attachment, URLandToken);
        if (responseOK) {
          Zotero.debug(
            `[Zot2AnythingLLM]-item ${items[i].id}-file ${attachment.filename} upload success`,
          );
        } else {
          Zotero.debug(
            `[Zot2AnythingLLM]-item ${items[i].id}-file ${attachment.filename} upload failed`,
          );
          failedFiles.push(attachment.filename);
        }
      }
      // 更新进度条
      popupWin.changeLine({
        text: "Uploading files to AnythingLLM",
        type: "default",
        progress: ((i + 1) / items.length) * 100,
      });
    }
    popupWin.changeLine({
      text: "Uploading files to AnythingLLM",
      type: "default",
      progress: 100,
    });
    popupWin.startCloseTimer(2000);
    // 如果有失败的文件，显示错误信息
    for (const filename of failedFiles) {
      const ErrorpopupWin = new ztoolkit.ProgressWindow(
        addon.data.config.addonName,
        {
          closeOnClick: true,
          closeTime: -1,
        },
      )
        .createLine({
          text: `${filename} ${getString("notUpload")}`,
          type: "error",
          progress: 0,
        })
        .show();
    }
  }

  /**
   * 获取条目的附件内容
   * @param item Zotero条目
   * @returns Promise<ZoteroAttachment[]>
   */
  private static async getItemAttachments(
    item: Zotero.Item,
  ): Promise<ZoteroAttachment[]> {
    const attachments: ZoteroAttachment[] = [];
    const attachmentItems = item.getAttachments();

    for (const attachmentID of attachmentItems) {
      const attachment = Zotero.Items.get(attachmentID);
      if (attachment.attachmentContentType === "application/pdf") {
        try {
          const path = attachment.getFilePath();
          if (path) {
            attachments.push({
              id: attachment.id,
              filename: attachment.attachmentFilename,
              contentType: attachment.attachmentContentType,
              path,
            });
          }
        } catch (error: any) {
          console.error(`fail to get ${attachment.id}:`, error);
        }
      }
    }

    return attachments;
  }
}
