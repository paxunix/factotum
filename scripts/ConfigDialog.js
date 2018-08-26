//XXX:"use strict";


/*

// Simple class to popup a modal HTML5 dialog with configurable options.
// Supports radio button groups, boolean checkboxes, and single-line text
// input.

d = new ConfigDialog({
    title: "The Dialog Title",      // title is optional
    sections: [ // rendering data
        {
            display: "Section 1",   // section display names are optional
            options: [
                { display: "Option 1", key: "opt1" },
                { display: "Opt 2", key: "opt2" },
            ]
        },
        {
            display: "Sec 2",
            options: [
                { display: "Opt 2.1", key: "opt2.1" }
            ]
        },
        {
            display: "Radio Section",
            options: [
                // If an option has a value, it will be rendered as a radio
                // button.  You will want the key for each radio button to
                // be the same for that given grouping (which does not
                // strictly have to be contained within a single section).
                { display: "Rad 1", key: "optradio", value: "r1" },
                { display: "Rad 2", key: "optradio", value: "r2" },
                { display: "Rad 3", key: "optradio", value: "r3" },
            ]
        },
    ]},
    {   // initial data
        opt1: true,
        opt2: "some text",
        "opt2.1": false,
        "optradio": "r2",
    },
    document);

d.show()
    .then(data => { console.log("d data: ", data); })
    .catch(() => { console.log("d cancelled/aborted"); });

d2 = new ConfigDialog({ title: "Some Title", sections: [ { options: [ { display: "Thing 1", key: "thingval" } ] } ] }, {}, document);

d2.show()
    .then(data => { console.log("d2 data: ", data); })
    .catch();
*/

const OKAY_TEXT = "Ok";
const CANCEL_TEXT = "Cancel";
const STYLE_ID = "ConfigDialog_style";
const OPT_CLASS = "opt";


class ConfigDialog
{
    constructor(config, initialState, doc)
    {
        this.config = config;

        this.dialog = doc.createElement("dialog");
        this.dialog.classList.add(STYLE_ID);
        this.dialog.style = "text-align: left;";

        this.setDialogState(initialState);

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


    static renderCheckbox(option, state)
    {
        let key = ConfigDialog.htmlEscape(option.key);
        let displayName = ConfigDialog.htmlEscape(option.display);

        return `<label><input class="${OPT_CLASS}" type="checkbox" name="${key}" ${state[option.key] ? "checked" : ""}/>${displayName}</label>`;
    }


    static renderInput(option, state)
    {
        let key = ConfigDialog.htmlEscape(option.key);
        let displayName = ConfigDialog.htmlEscape(option.display);

        return `<label>${displayName} <input class="${OPT_CLASS}" type="text" name="${key}" value="${ConfigDialog.htmlEscape(state[option.key] || "")}"}/></label>`;
    }


    static renderRadio(option, state)
    {
        let key = ConfigDialog.htmlEscape(option.key);
        let displayName = ConfigDialog.htmlEscape(option.display);

        return `<label><input class="${OPT_CLASS}" type="radio" name="${key}" ${state[option.key] === option.value ? "checked" : ""} value="${ConfigDialog.htmlEscape(option.value)}"/>${displayName}</label>`;
    }


    static renderOption(option, state)
    {
        // Note that the state's data (not the rendering input) determines
        // the option type.
        let keyType = typeof(state[option.key]);
        let hasValue = option.hasOwnProperty("value");

        if (hasValue)
            return ConfigDialog.renderRadio(option, state);

        if (keyType === "boolean")
            return ConfigDialog.renderCheckbox(option, state);

        return ConfigDialog.renderInput(option, state);
    }


    static renderSection(sectionData, state)
    {
        let displayName = sectionData.display ?
            `<legend>${ConfigDialog.htmlEscape(sectionData.display)}</legend>` :
            "";
        let markup = [ `<fieldset style="margin-bottom: 1.5ex;">${displayName}` ];

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


    getMarkup(newState)
    {
        let markup = [
            "<div>",
            this.config.title ? ConfigDialog.renderTitle(this.config.title) : "",
            "<form method='dialog' style='height: 100%;'>",
        ];

        for (let sect of this.config.sections)
        {
            markup.push(ConfigDialog.renderSection(sect, newState));
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
        let oldState = this.getDialogState();

        return new Promise((res, rej) => {
            this.onOkay = () => {
                return res(this.getDialogState());
            };

            this.onCancel = () => {
                this.setDialogState(oldState);
                rej();
            };

            this.dialog.showModal();
        });
    }


    getDialogState()
    {
        let state = {};

        for (let el of this.dialog.querySelectorAll(`.${OPT_CLASS}`))
        {
            switch (el.type)
            {
                case "checkbox":
                    state[el.name] = el.checked;
                    break;

                case "text":
                    state[el.name] = el.value;
                    break;

                case "radio":
                    if (el.checked)
                        state[el.name] = el.value;

                    break;

                default:
                    break;
            }
        }

        return state;
    }


    setDialogState(newState)
    {
        this.dialog.innerHTML = this.getMarkup(newState);
    }
};
