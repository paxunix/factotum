import './factotum-shared-styles.js';
import {PolymerElement, html} from '../node_modules/@polymer/polymer/polymer-element.js';

import '../node_modules/@polymer/iron-icons/iron-icons.js';
import '../node_modules/@polymer/paper-item/paper-icon-item.js';
import '../node_modules/@polymer/paper-styles/color.js';
import '../node_modules/@polymer/paper-icon-button/paper-icon-button.js';
import '../node_modules/@polymer/paper-input/paper-input.js';


class PopupElement extends PolymerElement
{
  static get template() {
    return html`
<style include="factotum-shared-styles">
  paper-icon-item {
    cursor: pointer;
  }

  paper-icon-item:hover {
    background: var(--light-secondary-color);
  }

  #quick-add {
    --paper-input-container-input-color: var(--secondary-text-color);
    width: 12em;
    transition-property: width;
    transition-duration: 0.3s;
  }

  #quick-add[focused] {
      width: 40em;
  }

  #loadUrl {
      margin-top: 2ex;
  }

  .error {
    color: red;
  }

  .success {
    color: green;
  }

</style>

<div id="menu">
    <paper-icon-item>
      <!--
      XXX: show and then fade out one of these icons when the Fcommand is saved successfully, or there is a problem.
      <iron-icon class="error" icon="icons:error" item-icon></iron-icon>
      <iron-icon class="success" icon="icons:check-circle" item-icon></iron-icon>
      -->
      <paper-input id="quick-add" label="Quick Add" placeholder="Fcommand URL" value="{{fcommandUrl}}" on-change="_onChange"></paper-input>
      <paper-icon-button id="loadUrl" icon="save" on-click="saveAction"></paper-icon-button>
    </paper-icon-item>
    <paper-icon-item id="menu-fcommands" on-click="clickFcommands">
      <iron-icon icon="apps" slot="item-icon"></iron-icon>
      Fcommands
    </paper-icon-item>
    <paper-icon-item id="menu-settings" disabled="">
      <iron-icon icon="settings-applications" slot="item-icon"></iron-icon>
      Settings
    </paper-icon-item>
    <paper-icon-item id="menu-errors" on-click="clickErrors">
      <iron-icon icon="error" slot="item-icon"></iron-icon>
      Errors
    </paper-icon-item>
    <paper-icon-item id="menu-help" disabled="">
      <iron-icon icon="help" slot="item-icon"></iron-icon>
      Help
    </paper-icon-item>
</div>
`;
  }

  static get is()
  {
      return "factotum-popup";
  }


  static get properties()
  {
      return {
          fcommandUrl: {
              type: String,
              value: "",
          }
      };
  }


  _onChange(evt)
  {
      this.saveAction();
  }


  saveAction()
  {
      let url = this.fcommandUrl.trim();

      if (url === "")
      {
          this.focus();
          return;
      }

      browser.runtime.getBackgroundPage()
          .then(bgScope => {
              bgScope.g_fcommandManager.fetchFcommandUrl(url)
                  .then(() => {
                    // Clear the URL entry control
                    // XXX: should have some visual indication of success (like backround of control fades from green to default)
                      this.fcommandUrl = "";
                  }).catch(() => {
                        // XXX: should have some visual indication of failure (like backround of control fades from red to default)
                      bgScope.g_fcommandManager.getErrorManager().save(error, `Failed to fetch Fcommand from URL '${url}'`)
                  });
          });
  }


  clickFcommands()
  {
      browser.runtime.getBackgroundPage()
          .then(bgScope => {
              bgScope.g_fcommandManager.openFcommandsPage();
          });
  }


  clickErrors()
  {
      browser.runtime.getBackgroundPage()
          .then(bgScope => {
              bgScope.g_fcommandManager.getErrorManager()._openErrorPage();
          });
  }


  ready()
  {
      super.ready();
  }
}

customElements.define(PopupElement.is, PopupElement);
