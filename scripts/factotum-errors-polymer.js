import './factotum-shared-styles.js';
import {PolymerElement, html} from '../node_modules/@polymer/polymer/polymer-element.js';

class ErrorsElement extends PolymerElement
{
  static get template() {
    return html`
  <style include="factotum-shared-styles">
  #errorList {
      width: 100%;
  }
  </style>

  <app-header-layout fullbleed="">
    <app-header slot="header" fixed="">
      <app-toolbar>
        <div main-title="">Factotum Errors</div>
        <paper-icon-button id="deleteErrors" icon="icons:delete" on-click="deleteAction"></paper-icon-button>
      </app-toolbar>
    </app-header>

    <table id="errorList">
      <template is="dom-repeat" items="[[errorList]]">
        <tr class="stripeRow">
          <td>
            <pre>[[item.stack]]</pre>
          </td>
        </tr>
      </template>
    </table>

  </app-header-layout>
`;
  }

  static get is()
  {
      return "factotum-error";
  }


  static get properties()
  {
      return {
          errorList: {
              type: Array,
              value: () => [],
          },
          deleteActionEnabled: {
              type: Boolean,
              observer: "_deleteActionEnabled",
          }
      };
  }


  _deleteActionEnabled(newValue, oldValue)
  {
      this.$.deleteErrors.disabled = !newValue;
  }


  ready()
  {
      super.ready();

      browser.runtime.getBackgroundPage()
          .then(bgScope => {
              let errorManager = bgScope.g_fcommandManager.getErrorManager();
              this.deleteActionEnabled = errorManager.length() != 0;

              for (let err of errorManager)
              {
                  this.push("errorList", err);
              }
          });
    }


  deleteAction()
  {
      browser.runtime.getBackgroundPage()
          .then(bgScope => {
              let errorManager = bgScope.g_fcommandManager.getErrorManager();

              errorManager.clear();
          });
  }
}

customElements.define(ErrorsElement.is, ErrorsElement);
