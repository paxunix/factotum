import './factotum-shared-styles.js';
import {PolymerElement, html} from '../node_modules/@polymer/polymer/polymer-element.js';

import '../node_modules/@polymer/iron-icons/iron-icons.js';
import '../node_modules/@polymer/paper-item/paper-icon-item.js';
import '../node_modules/@polymer/paper-icon-button/paper-icon-button.js';
import '../node_modules/@polymer/paper-input/paper-textarea.js';
import '../node_modules/@polymer/paper-listbox/paper-listbox.js';
import '../node_modules/@polymer/app-layout/app-header-layout/app-header-layout.js';
import '../node_modules/@polymer/app-layout/app-header/app-header.js';
import '../node_modules/@polymer/app-layout/app-toolbar/app-toolbar.js';
import '../node_modules/@polymer/app-layout/app-drawer-layout/app-drawer-layout.js';
import '../node_modules/@polymer/app-layout/app-drawer/app-drawer.js';


class FcommandsElement extends PolymerElement
{
  static get template() {
    return html`
  <style include="factotum-shared-styles">
    :host {
      --app-drawer-width: 33em;
    }

    paper-icon-item {
      cursor: pointer;
    }

    paper-icon-item.iron-selected {
      background: var(--divider-color);
    }

    #drawer {
      border-right: 1px solid var(--divider-color);
    }

    /* Push the drawer content down so app-header toolbar doesn't cover it */
    #fcommandNameList {
      --topSize: 80px;
      margin-top: var(--topSize);
      height: calc(100% - var(--topSize));
      overflow: auto;
      --paper-listbox-background-color: var(--secondary-background-color);
      --paper-listbox-color: var(--secondary-text-color);
    }

    #editPane {
      padding-left: 1em;
      --paper-input-container-input-color: var(--secondary-text-color);
      --paper-input-container-input: {
          @apply --paper-font-common-code;
          font-size: 10pt;
          line-height: default;
      };
    }
  </style>

  <app-header-layout fullbleed="">
    <app-header slot="header" fixed="">
      <app-toolbar>
        <div main-title="">Factotum Fcommands</div>
      </app-toolbar>
    </app-header>

    <div>
    <app-drawer-layout>
      <app-drawer id="drawer" slot="drawer">
        <paper-listbox id="fcommandNameList" on-selected-changed="_onSelected">
              <!-- XXX: should style title with --secondary-color or
                --light-secondary-color if Fcommand is disabled -->
          <template is="dom-repeat" items="[[fcommandList]]">
            <paper-icon-item guid="[[item.extractedData.guid]]">
              <paper-icon-button icon="delete" slot="item-icon" on-click="_onDeleteClick"></paper-icon-button>
              [[item.extractedData.title]]
            </paper-icon-item>
          </template>
        </paper-listbox>
      </app-drawer>

      <paper-textarea id="editPane" label="Fcommand Content" placeholder="[[placeholderText]]" rows="40" on-keydown="_onKeyDown"></paper-textarea>

    </app-drawer-layout>
    <div>

</div></div></app-header-layout>
`;
  }

  static get is()
  {
      return "factotum-fcommands";
  }


  static get properties()
  {
      return {
          fcommandList: {
              type: Array,
              value: [],
          },
          placeholderText: {
              type: String,
              value: FcommandsElement._getPlaceholderText()
          },
      };
  }


  static _getPlaceholderText()
  {
      return `
<!DOCTYPE html>
<html>
<head>
<title>Sample Fcommand</title>
<meta charset="UTF-8">
<meta name="author" content="your email here">
<meta name="description" content="what does this Fcommand do">
<meta name="guid" content="a unique identifier">
<meta name="keywords" content="key1,key2">
<meta name="version" content="1.2.3">
<meta name="context" content="page">
<meta name="menu" content="all">
<link rel="icon" type="image/png" href="http://example.com/favicon.png">
</head>
<body>
<template id="help" lang="en">
help markup
</template>

<template id="getopt">
</template>

<script>
Factotum.runCommand(someFunc);
<\/script>

<template id="bgCode">
<script>
<\/script>
</template>

</body>
</html>
`;
  }


  _onSelected(evt)
  {
      let selItem = evt.target.selectedItem;

      browser.runtime.getBackgroundPage()
          .then(bgScope => bgScope.g_fcommandManager.getByGuid(selItem.guid))
          .then(fcommand => {
              this.$.editPane.$.input.value = fcommand.documentString;
          });
  }


  _onDeleteClick(evt)
  {
      let guid = evt.target.parentElement.guid;

      browser.runtime.getBackgroundPage()
          .then(bgScope => {
              bgScope.g_fcommandManager.deleteByGuid(guid)
                  .then(() => {
                    bgScope.g_fcommandManager.constructor._reloadFcommandPages();
                  });
          });
  }


  _onKeyDown(evt)
  {
      if (evt.key === "Tab")
      {
          evt.preventDefault();

          // Insert 4 spaces instead of a tab character
          // XXX: this should be configurable (so should whether Tab
          // does anything besides the usual movement between controls)
          let tabReplacement = "    ";
          let textAreaObj = this.$.editPane.$.input;
          var sel = textAreaObj.selectionStart;
          textAreaObj.value =
              textAreaObj.value.substring(0, textAreaObj.selectionStart) +
              tabReplacement +
              textAreaObj.value.substring(textAreaObj.selectionEnd);
          textAreaObj.selectionEnd = sel + tabReplacement.length;
      }

      if (++this.tempSaveConfig.currentKeyCount >= this.tempSaveConfig.saveAfterKeyCount)
      {
          this._saveToTempBuffer();
          this.tempSaveConfig.currentKeyCount = 0;
      }
  }


  // Persist the contents of the current buffer
  _saveToTempBuffer()
  {
      localStorage.setItem("editorContent", this.$.editPane.$.input.value);
  }


  constructor()
  {
      super();

      this.tempSaveConfig = {
          saveAfterKeyCount: 20,   // XXX: should be configurable
          saveAfterElapsedSec: 30,    // XXX: should be configurable
          currentKeyCount: 0,
          saveAtEpochTimeMSec: Date.now(),
      };

      browser.runtime.getBackgroundPage()
          .then(bgScope => bgScope.g_fcommandManager.getAll())
          .then(fcommands => {
              for (let fcommand of fcommands)
              {
                  this.push("fcommandList", fcommand);
              }
          });
  }
}

customElements.define(FcommandsElement.is, FcommandsElement);
