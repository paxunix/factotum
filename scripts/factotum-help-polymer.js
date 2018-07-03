import './factotum-shared-styles.js';
import {PolymerElement, html} from '../node_modules/@polymer/polymer/polymer-element.js';

class HelpElement extends PolymerElement
{
  static get template() {
    return html`
  <style include="factotum-shared-styles">
    #help-content {
        margin: 2em;
    }
  </style>

  <app-header-layout fullbleed="">
    <app-header slot="header" fixed="">
      <app-toolbar>
        <div main-title="">Factotum Command Help: <span id="fcommandName">[[fcommandName]]</span></div>
      </app-toolbar>
    </app-header>

    <div id="help-content">
    </div>
  </app-header-layout>
`;
  }

  static get is()
  {
      return "factotum-help";
  }


  static get properties()
  {
      return {
          fcommandName: {
              type: String,
              value: "",
          },
      };
  }


  ready()
  {
      super.ready();

      // Put help markup for this Fcommand into the dialog
      browser.runtime.getBackgroundPage()
          .then(bgScope => {
              // Extract Fcommand guid from "?guid=abcd" query string and use
              // it to get the help markup for the Fcommand.
              let guid = document.location.search.substr(6);

              let p_getFcommand = bgScope.g_fcommandManager.getByGuid(guid);
              p_getFcommand.then(fcommand => {
                  // XXX: it would be handy to use the same keyword that
                  // activated the help, rather than always using the first
                  // keyword for the Fcommand
                  this.fcommandName = fcommand.extractedData.keywords[0];
                  document.title = `Factotum Command Help: ${this.fcommandName}`;

                  // Can't use Polymer property assignment since it
                  // automatically escapes all markup, so set content directly.
                  // XXX: what about malicious help markup in an Fcommand?
                  // This opens an XSS vector.  Factotum already opens that up
                  // by its nature, so...
                  this.$["help-content"].innerHTML = fcommand.extractedData.helpMarkup;
              }).catch(error => {
                  p_getFcommand.then(fcommand => {
                    bgScope.g_fcommandManager.getErrorManager().save(error, `Failed help display for '${fcommand.extractedData.title}'`);
                  });
              });
          });
  }
}

customElements.define(HelpElement.is, HelpElement);
