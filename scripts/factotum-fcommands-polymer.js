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

import '../node_modules/@granite-elements/ace-widget/ace-widget.js';

import Fcommand from './Fcommand.js';


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

    <app-toolbar>
      <paper-icon-button id="save" icon="save" on-click="_saveFcommand" disabled></paper-icon-button>
      <paper-icon-button id="add" icon="add" on-click="_addFcommand"></paper-icon-button>
    </app-toolbar>

    <ace-widget id="editPane"
        placeholder="Enter your Fcommand here"
        maxlines="40"
        minlines="40"
        mode="ace/mode/html"
        tab-size="4"
        softtabs="true"
        initial-focus
        on-editor-ready="_onEditorReady">
    </ace-widget>

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

      browser.runtime.getBackgroundPage()
          .then(bgScope => bgScope.g_fcommandManager.getByGuid(selItem.guid))
          .then(fcommand => {
              this.$.editPane.editor.getSession().setValue(fcommand.documentString);
              this.saveActionEnabled = true;
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


  _saveFcommand(evt)
  {
      let document = this.$.editPane.editor.getValue();

      try
      {
          let newFcommand = new Fcommand(document, navigator.language);

          // XXX:  should delete the old one if the new guid is different?
          // Or just leave it and the user can delete the one under edit if
          // desired.
          // It's all keyed on guid.
          // After save, just refresh the page.  XXX: that's too jarring
          // (loses cursor position, current fcommand being edited, etc),
          // but it ensures clean state for now.
          browser.runtime.getBackgroundPage()
              .then(bgScope => bgScope.g_fcommandManager.save(newFcommand))
              .then(() => window.location.reload());
      }

      catch (e)
      {
          console.log(`Save error: ${e}`);
          //XXX:  this.showError(e);
      }
  }


  _saveActionEnabled(newValue, oldValue)
  {
      this.$.save.disabled = !newValue;
  }


  _onEditorReady(evt)
  {
      this.$.editPane.editor.getSession().setNewLineMode("unix");
  }


  constructor()
  {
      super();

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
