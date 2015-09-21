"use strict";

module.exports = (function() {


function PopupMenu(document)
{
    document.querySelector("#menu-quick-add")
        .addEventListener("click", PopupMenu.menuQuickAddClick);
}


PopupMenu.menuQuickAddClick = function (evt) {
    console.log("Quick add clicked:", evt);
};


return PopupMenu;


})();
