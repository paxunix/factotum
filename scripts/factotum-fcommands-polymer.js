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

import Fcommand from './Fcommand.js';


// Basic template to pre-fill the editor for new Fcommands.
let fcommandTemplateString = `<html>

<head>

<title>New Fcommand \${tempUuid}</title>

<meta charset="UTF-8">
<meta name="author" content="YOUR_EMAIL_HERE@example.com">
<meta name="description" content="Describe what your Fcommand does">
<meta name="guid" content="\${tempUuid}">
<meta name="keywords" content="Comma-separated list of keywords to run your Fcommand">
<meta name="version" content="1">
<meta name="context" content="page">
<!--
If you want your Fcommand to run from the context menu, uncomment the next
<meta> line and choose a context type from
https://developer.chrome.com/apps/contextMenus#type-ContextType to indicate
when your Fcommand should appear in the context menu.  -->
<!--
<meta name="menu" content="all">
-->

</head>

<body>
<template id="getopt">
<!-- If your Fcommand has no options of its own, you can remove this entire
     <template>.  This is strict JSON, so watch your trailing commas! -->
<script>
{
    "test-option": {
        "type": "boolean",
        "default": false
    }
}
</script>
</template>

<template id="help" lang="en">
  <h2>YOUR FCOMMAND'S HELP MARKUP</h2>
  blah<p>
  blah
</template>

<template id="bgCode">
<script>
console.log("Whatever javascript should run with the result of your Fcommand's page code.  If unneeded, you can remove this entire <template>.");
<\/script>
</template>

<script>
function YOUR_FCOMMAND(transferObj) {

let opts = transferObj.getCommandLine();
console.log("opts: ", opts);

}

if (window.Factotum && Factotum.runCommand)
    Factotum.runCommand(YOUR_FCOMMAND_FUNCTION_NAME);
else
    throw new Error("Factotum not enabled");
<\/script>

</body>
</html>
`;


let fillTemplate = (templateString, templateVars) => {
    let f = new Function(...Object.keys(templateVars), "return `" + templateString + "`")
    return f(...Object.values(templateVars));
};


class FcommandsElement extends PolymerElement
{
  static get template() {
    return html`
  <style include="factotum-shared-styles">
    :host {
      --app-drawer-width: 45em;
    }

    paper-icon-item {
      align-items: baseline;
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
      align: baseline;
    }

    .fcommandNameListKeywords {
        font-size: 80%;
        min-width: 20%;
    }

    #editorContainer {
      height: 85vh;
      width: 100%;
      position: relative;
    }

    #editPane {
      border: 1px solid #e3e3e3;
      padding-left: 1em;
      padding-right: 1em;
      margin-right: 1em;
      margin-top: 0px;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
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
        <paper-listbox id="fcommandNameList" on-selected-changed="_onSelected" attr-for-selected="guid">
              <!-- XXX: should style title with --secondary-color or
                --light-secondary-color if Fcommand is disabled -->
          <template is="dom-repeat" items="[[fcommandList]]">
            <paper-icon-item guid="[[item.extractedData.guid]]">
              <paper-icon-button icon="delete" slot="item-icon" on-click="_onDeleteClick"></paper-icon-button>
              <div class="fcommandNameListKeywords">[[item.displayKeywordList]]</div>
              <div class="fcommandNameListTitle">[[item.extractedData.title]]</div>
            </paper-icon-item>
          </template>
        </paper-listbox>
      </app-drawer>

    <div>
      <app-toolbar>
        <paper-icon-button id="save" icon="save" on-click="_saveFcommand" disabled></paper-icon-button>
        <paper-icon-button id="add" icon="add" on-click="_addFcommand"></paper-icon-button>
      </app-toolbar>

      <div id="editorContainer">
        <div id="editPane"></div>
      </div>
    </div>

    </app-drawer-layout>
    </div>

</app-header-layout>
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
          saveActionEnabled: {
              type: Boolean,
              observer: "_saveActionEnabled",
          }
      };
  }


  _onSelected(evt)
  {
      let selItem = evt.target.selectedItem;
      // XXX: what if item is no longer selected?  this happens I think on
      // first load?

      browser.runtime.getBackgroundPage()
          .then(bgScope => bgScope.g_fcommandManager.getByGuid(selItem.guid))
          .then(fcommand => {
              this._setDocument(fcommand.documentString);
              this.editor.getSession().setScrollTop(0);
          });
  }


  _onDeleteClick(evt)
  {
      let guid = evt.target.parentElement.guid;

      browser.runtime.getBackgroundPage()
          .then(bgScope => bgScope.g_fcommandManager.deleteByGuid(guid))
          .then(() => {
              this.refreshFcommandList();
              this._setDocument("");
              // XXX: Reset editor?  should clear all state?
          });
  }


  _saveFcommand(evt)
  {
      let docString = this.editor.getValue();

      try
      {
          let newFcommand = new Fcommand(docString, navigator.language);

          // XXX:  should delete the old one if the new guid is different?
          // Or just leave it and the user can delete the one under edit if
          // desired.
          // XXX: have to set the correct one (new one) as selected after
          // the save
          browser.runtime.getBackgroundPage()
              .then(bgScope => bgScope.g_fcommandManager.save(newFcommand))
              .then(() => this.refreshFcommandList());

          this.saveActionEnabled = false;
      }

      catch (e)
      {
          console.log(`Save error: ${e}`);
          //XXX:  this.showError(e);
      }
  }


  _addFcommand(evt)
  {
      // XXX: reset editor view to 1,1
      let tempUuid = Fcommand._getUuid();
      let newFcommandDoc = fillTemplate(fcommandTemplateString,
          {tempUuid: tempUuid });

      this._setDocument(newFcommandDoc);

      // Clear the selection.  This throws because there is no guid, but
      // does clear the selection.
      try { this.$.fcommandNameList.selectIndex(-1); } catch (e) { ; }
  }


  _saveActionEnabled(newValue, oldValue)
  {
      this.$.save.disabled = !newValue;
  }


  _setDocument(docString)
  {
      // XXX: should this actually create a new Document instead?
      this.editor.getSession().setValue(docString);

      if (docString === "")
          this.saveActionEnabled = false;

      this.editor.focus();
  }


  refreshFcommandList()
  {
      browser.runtime.getBackgroundPage()
          .then(bgScope => bgScope.g_fcommandManager.getAll())
          .then(fcommands => {
              // XXX:  this seems hacky, creating the displayable list of
              // keywords the way we want
              fcommands.forEach(fcommand => {
                  fcommand.displayKeywordList = fcommand.extractedData.keywords.join(", ");
              });
              this.splice("fcommandList", 0, this.fcommandList.length, ...fcommands);
          });
  }


  async connectedCallback()
  {
      super.connectedCallback();

      let baseUrl = `${this.rootPath}../node_modules/ace-builds/src-min-noconflict`;

      await import("../node_modules/ace-builds/src-min-noconflict/ace.js");
      await import(`${baseUrl}/ext-language_tools.js`);

      // ace is now in global scope, so set up editor
      ace.config.set("basePath", baseUrl);
      ace.config.set("modePath", baseUrl);
      ace.config.set("themePath", baseUrl);
      ace.config.set("workerPath", baseUrl);

      let editor = ace.edit(this.$.editPane);
      editor.setOptions({
          cursorStyle: "wide",
          fontSize: "10pt",
          mergeUndoDeltas: "always",
          mode: "ace/mode/html",
          newLineMode: "unix",
          tabSize: 4,       // XXX: should be configurable
          theme: "ace/theme/eclipse",
          useSoftTabs: true,
      });

      // The styles needed for the editor pane were loaded into the main
      // document but we need them in this component's shadow root, so
      // move them there.
      let styleNode = this.getRootNode().querySelector("#ace_editor\\.css");
      this.shadowRoot.appendChild(styleNode.parentNode.removeChild(styleNode));

      editor.focus();
      editor.resize();

      editor.getSession().on("change", () => {
          if (editor.curOp && editor.curOp.command.name)  // user-initiated action: from https://github.com/ajaxorg/ace/issues/503
              this.saveActionEnabled = true
      });

      this.editor = editor;
  }


  constructor()
  {
      super();

      this.refreshFcommandList();
  }
}


customElements.define(FcommandsElement.is, FcommandsElement);
