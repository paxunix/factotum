"use strict";


const localization_en_US = {
    OKAY_TEXT: "Ok",
    CANCEL_TEXT: "Cancel",
};
const STYLE_ID = "ConfigDialog_style";


class ConfigDialog
{
    constructor(config, initialState, doc, localization = localization_en_US)
    {
        this.config = config;
        this.localization = localization;

        this.dialog = doc.createElement("dialog");
        this.dialog.classList.add(STYLE_ID);
        this.dialog.style = "text-align: left;";

        this.setDialogState(initialState);

        // Set in show()
        this.resolveOkay = null;
        this.rejectCancel = null;

        // Called regardless of how the dialog was closed, so no need for
        // separate cancel event handler.
        this.dialog.addEventListener("close", evt => {
            if (this.dialog.returnValue === localization.OKAY_TEXT)
            {
                this.resolveOkay();
                return;
            }

            this.rejectCancel();
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
        return String(str).replace(/&/g, '&amp;') // first!
              .replace(/>/g, '&gt;')
              .replace(/</g, '&lt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/`/g, '&#96;');
    }


    static renderCheckbox(item, state)
    {
        let key = ConfigDialog.htmlEscape(item.key);
        let displayName = ConfigDialog.htmlEscape(item.display);

        return `<label><input type="checkbox" name="${key}" ${state[item.key] ? "checked" : ""}/>${displayName}</label>`;
    }


    static renderEscMarkup(item, state)
    {
        return `<p>${ConfigDialog.htmlEscape(item.content)}</p>`;
    }


    static renderMarkup(item, state)
    {
        return `<p>${item.content}</p>`;
    }


    static renderInput(item, state)
    {
        let key = ConfigDialog.htmlEscape(item.key);
        let displayName = ConfigDialog.htmlEscape(item.display);

        return `<label>${displayName} <input type="text" name="${key}" value="${ConfigDialog.htmlEscape(state[item.key] || "")}"}/></label>`;
    }


    static renderRadioGroup(item, state)
    {
        let key = ConfigDialog.htmlEscape(item.key);
        let markup = [ ];

        for (let i of item.items)
        {
            let displayName = ConfigDialog.htmlEscape(i.display);

            markup.push(`<label><input style="display: block;" type="radio" name="${key}" ${state[key] === i.value ? "checked" : ""} value="${ConfigDialog.htmlEscape(i.value)}"/>${displayName}</label>`);
        }

        return markup.join("\n");
    }


    static renderSelect(item, state)
    {
        let key = ConfigDialog.htmlEscape(item.key);
        let markup = [ `<select style="width: 100%;" name=${key}>` ];

        for (let i of item.items)
        {
            let displayName = ConfigDialog.htmlEscape(i.display);
            markup.push(`<label><option ${state[key] === i.value ? "selected" : ""} value="${ConfigDialog.htmlEscape(i.value)}"/>${displayName}</label>`);
        }

        markup.push("</select>");

        return markup.join("\n");
    }


    static renderItem(item, state)
    {
        let renderFunc;

        switch (item.type)
        {
            case "escmarkup":
                renderFunc = ConfigDialog.renderEscMarkup;
                break;

            case "markup":
                renderFunc = ConfigDialog.renderMarkup;
                break;

            case "text":
                renderFunc = ConfigDialog.renderInput;
                break;

            case "pulldown":
                renderFunc = ConfigDialog.renderSelect;
                break;

            case "checkbox":
                renderFunc = ConfigDialog.renderCheckbox;
                break;

            case "radiogroup":
                renderFunc = ConfigDialog.renderRadioGroup;
                break;

            default:
                throw new Error(`Unknown item type ${item.type}`);
        }

        return renderFunc(item, state);
    }


    static renderSection(sectionData, state)
    {
        let displayName = sectionData.section ?
            `<legend>${ConfigDialog.htmlEscape(sectionData.section)}</legend>` :
            "";
        let markup = [ `<fieldset style="margin-bottom: 1.5ex;">${displayName}` ];

        for (let i of sectionData.items)
        {
            markup.push(`<div style="margin-bottom: 1ex;">${ConfigDialog.renderItem(i, state)}</div>`);
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
    background: linear-gradient(45deg, rgba(6,33,47,0.82), rgba(84,157,195,0.82));

dialog.${STYLE_ID} .okayButton {
    width: 5em;
}

dialog.${STYLE_ID} .cancelButton {
    width: 5em;
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
<input type="button" class="okayButton" value="${ConfigDialog.htmlEscape(this.localization.OKAY_TEXT)}" />
<input type="button" class="cancelButton" value="${ConfigDialog.htmlEscape(this.localization.CANCEL_TEXT)}" />
</div>
`);
        markup.push("</form>", "</div>");

        return markup.join("\n");
    }


    show()
    {
        let oldState = this.getDialogState();

        return new Promise((res, rej) => {
            this.resolveOkay = () => {
                res(this.getDialogState());
            };

            this.rejectCancel = () => {
                this.setDialogState(oldState);
                rej({});
            };

            // Ensure state is cleared before displaying, since this is set
            // by canceling the dialog with Esc or via form interactions.
            this.dialog.returnValue = "";
            this.dialog.showModal();
        });
    }


    getDialogState()
    {
        let state = {};
        let form = this.dialog.querySelector("form");
        let formData = new FormData(form);

        for (let d of formData.entries())
        {
            let [key, value] = d;
            if (form.elements[key].type === "checkbox")
                continue;       // checkboxes handled specially below

            state[key] = value;
        }

        // Checkboxes that are not checked will not have an entry in
        // FormData.  Since we prefer to have an explicit true/false for
        // every checkbox, we look these up separately to set their value.
        for (let checkbox of form.querySelectorAll("input[type=checkbox]"))
            state[checkbox.name] = !!checkbox.checked;

        return state;
    }


    setDialogState(newState)
    {
        this.dialog.innerHTML = this.getMarkup(newState);

        // Mirror default behaviour of HTML5 dialogs if the Okay button were
        // to submit and the Cancel button were to reset.
        this.dialog.querySelector(".okayButton").addEventListener("click", () => {
            this.dialog.returnValue = this.localization.OKAY_TEXT;
            this.dialog.close();
        });
        this.dialog.querySelector(".cancelButton").addEventListener("click", () => {
            this.dialog.returnValue = this.localization.CANCEL_TEXT;
            this.dialog.close();
        });
    }
};

export default ConfigDialog;
