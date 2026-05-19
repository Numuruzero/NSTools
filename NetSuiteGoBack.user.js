// ==UserScript==
// @name        NetSuite GoBack
// @namespace   jhutt.com
// @match       https://1206578.app.netsuite.com/app/accounting/transactions/salesord.nl*
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @version     69
// ==/UserScript==

if (document.querySelector("body > div.uir-error-page-content > div.uir-error-page-message")) {
    if (document.querySelector("body > div.uir-error-page-content > div.uir-error-page-message").textContent == 'Record has been changed') {
        document.querySelector("#goback").click();
    }
}
