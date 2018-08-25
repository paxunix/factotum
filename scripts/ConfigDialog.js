"use strict";


const OKAY_TEXT = "Ok";
const CANCEL_TEXT = "Cancel";
const STYLE_ID = "ConfigDialog_style";


class ConfigDialog
{
    constructor(config, state, doc)
    {
        this.config = Object.assign({}, config);
        this.state = Object.assign({}, state);

        this.dialog = doc.createElement("dialog");
        this.dialog.id = `configDialog_${ConfigDialog._getUuid()}`;
        this.dialog.classList.add(STYLE_ID);
        this.dialog.innerHTML = this.getMarkup();
        this.dialog.style = "text-align: left;";

        // Set in show()
        this.onOkay = null;
        this.onCancel = null;

        // Called regardless of how the dialog was closed, so no need for
        // separate cancel event handler.
        this.dialog.addEventListener("close", evt => {
            if (this.dialog.returnValue === OKAY_TEXT)
                return this.onOkay();

            return this.onCancel();
        });

        // Only add style to document head if it's not already there (same
        // styling is shared by all ConfigDialogs).
        if (!doc.head.querySelector(`style#${STYLE_ID}`))
            doc.head.appendChild(this.getCssStyleNode(doc));

        doc.body.appendChild(this.dialog);
    }


    static _stripSpaces(s)
    {
        return s.replace(/\s+/g, "");
    }


    static _getUuid()
    {
        // from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }


    // from http://2ality.com/2015/01/template-strings-html.html
    static htmlEscape(str)
    {
        return str.replace(/&/g, '&amp;') // first!
              .replace(/>/g, '&gt;')
              .replace(/</g, '&lt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/`/g, '&#96;');
    }


    static html(literalSections, ...substs)
    {
        // Use raw literal sections: we don’t want
        // backslashes (\n etc.) to be interpreted
        let raw = literalSections.raw;

        let result = '';

        substs.forEach((subst, i) => {
            // Retrieve the literal section preceding
            // the current substitution
            let lit = raw[i];

            // In the example, map() returns an array:
            // If substitution is an array (and not a string),
            // we turn it into a string
            if (Array.isArray(subst)) {
                subst = subst.join('');
            }

            // If the substitution is preceded by a dollar sign,
            // we escape special characters in it
            if (lit.endsWith('$')) {
                subst = htmlEscape(subst);
                lit = lit.slice(0, -1);
            }
            result += lit;
            result += subst;
        });

        // Take care of last literal section
        // (Never fails, because an empty template string
        // produces one literal section, an empty string)
        result += raw[raw.length-1]; // (A)

        return result;
    }


    static makeId(s)
    {
        return ConfigDialog._stripSpaces(s);
    }


    static renderCheckbox(option, state)
    {
        let id = ConfigDialog.htmlEscape(ConfigDialog.makeId(option.key));
        let displayName = ConfigDialog.htmlEscape(option.name);

        return `<label><input type="checkbox" id="${id}" ${state[option.key] ? "checked" : ""}/>${displayName}</label>`;
    }


    static renderInput(option, state)
    {
        let id = ConfigDialog.htmlEscape(ConfigDialog.makeId(option.key));
        let displayName = ConfigDialog.htmlEscape(option.name);

        return `<label>${displayName} <input type="text" id="${id}" value="${ConfigDialog.htmlEscape(state[option.key])}"}/></label>`;
    }


    static renderOption(option, state)
    {
        switch (typeof(state[option.key]))
        {
            case "boolean":
                return ConfigDialog.renderCheckbox(option, state);

            default:
                return ConfigDialog.renderInput(option, state);
        }
    }


    static renderSection(sectionData, state)
    {
        let displayName = ConfigDialog.htmlEscape(sectionData.name);
        let markup = [ `<fieldset style="margin-bottom: 1.5ex;"><legend>${displayName}</legend>` ];

        for (let opt of sectionData.options)
        {
            markup.push(`<div style="margin-bottom: 1ex;">${ConfigDialog.renderOption(opt, state)}</div>`);
        }

        markup.push("</fieldset>");

        return markup.join("\n");
    }


    static renderTitle(title)
    {
        return `<div style="background-color: #1783ca; font-weight: bold; font-size: 12pt; padding: 0.5ex; margin-bottom: 1.5ex; text-align: center;">${ConfigDialog.htmlEscape(title)}</div>`;
    }


/*
{
  title: "The Dialog Title",
  sections: [
       { name: "Section 1",
         options: [
           { name: "Option 1", key: "opt1" },
           { name: "Opt 2", key: "opt2" },
         ]
       },
       { name: "Section 2", options: [ { name: "Opt 2.1", key: "opt3" } ] },
     // ...
  ]
}
*/
    getCssStyleNode(doc)
    {
        let style = doc.createElement("style");

        style.id = STYLE_ID;
        style.textContent = `
dialog.${STYLE_ID}::backdrop {
    background: #114865eb;
}
`;

        return style;
    }


    getMarkup()
    {
        let markup = [
            "<div>",
            this.config.title ? ConfigDialog.renderTitle(this.config.title) : "",
            "<form method='dialog' style='height: 100%;'>",
        ];

        for (let sect of this.config.sections)
        {
            markup.push(ConfigDialog.renderSection(sect, this.state));
        }

        markup.push(`
<div style="display: flex; justify-content: space-evenly;">
<input type="submit" style="width: 5em;" value="${OKAY_TEXT}" />
<input type="submit" style="width: 5em;" value="${CANCEL_TEXT}" />
</div>
`);
        markup.push("</form>", "</div>");

        return markup.join("\n");
    }


    show()
    {
        let currentState = this.getDialogState();

        return new Promise((res, rej) => {
            this.onOkay = () => {
                return res(this.getDialogState());
            };

            this.onCancel = () => {
                this.setDialogState(currentState);

                return rej();
            };

            this.dialog.showModal();
        });
    }


    getDialogState()
    {
        // XXX

    }


    setDialogState()
    {
        ///XXX
    }
};


d = new ConfigDialog({
  title: "The Dialog Title",
  sections: [
       { name: "Section 1",
         options: [
           { name: "Option 1", key: "opt1" },
           { name: "Opt 2", key: "opt2" },
         ]
       },
       { name: "Sec 2", options: [ { name: "Opt 2.1", key: "opt2.1" } ] },
  ]
}, {
    opt1: true,
    opt2: "some text",
    "opt2.1": false,
},
document);
