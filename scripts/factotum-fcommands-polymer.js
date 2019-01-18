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

    <ace-widget id="editPane"
        placeholder="Enter your Fcommand here"
        maxlines="40"
        minlines="40"
        mode="html"
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
      };
  }


  _onSelected(evt)
  {
      let selItem = evt.target.selectedItem;

      browser.runtime.getBackgroundPage()
          .then(bgScope => bgScope.g_fcommandManager.getByGuid(selItem.guid))
          .then(fcommand => {
              this.$.editPane.editor.setValue(fcommand.documentString);
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
