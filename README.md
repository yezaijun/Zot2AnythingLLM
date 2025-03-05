# Zotero to AnythingLLM

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

This is a plugin to upload attachments in [Zotero](https://www.zotero.org/) to [AnythingLLM](https://anythingllm.com) via AnythingLLM api.

[English](README.md) | [简体中文](doc/README-zhCN.md)

## Usage

1. Install the plugin.
2. Keep AnythingLLM running.
3. Go to the plugin settings and fill in the AnythingLLM API key.
4. Right-click on the item you want to upload and select "Upload to AnythingLLM".

## Notes

- This plugin just upload the attachment to AnythingLLM but not check if the attachment is already uploaded.
  - Navigate to AnythingLLM folder to manage the attachments.
  - On MacOS, the default AnythingLLM folder is `~/Library/Application Support/anythingllm-desktop/storage/documents/`.
