// ==UserScript==
// @name        PJ Quotes Script
// @namespace   jhutt.com
// @match       https://1206578.app.netsuite.com/app/common/custom/custrecordentry.nl*
// @downloadURL https://github.com/Numuruzero/NSTools/raw/refs/heads/main/PJGPTools.user.js
// @version     1.1
// ==/UserScript==

const url = window.location.href;
const pjCheck = 'rectype=3097';
const gpCheck = 'rectype=2330';

let context;
typeof GM !== 'undefined' ? console.log("We're in a userscript") : console.log("No userscript here");

/////////////////////////////////////Begin PJ Quote Functions/////////////////////////////////////
// We are using the XML output of the record for info which is shoved into orderInfo.
function copyParcelInfo() {
    const cleanTags = new RegExp('</*(?:u|b)>', 'g');
    const findPcs = new RegExp(/Total Carton Quantity: (\d+)/, 'g');
    const findInfo = new RegExp(/Qty: (?<qty>\d+), (?<lbs>[\d\.]+) lbs, (?<len>[\d\.]+) x (?<wid>[\d\.]+) x (?<hgt>[\d\.]+)/, 'g');
    let parcelRaw = orderInfo.getElementsByTagName("custrecord_sq_quoted_parcel_pkg")[0].textContent;
    parcelRaw = parcelRaw.replaceAll(cleanTags, '');
    const parcelInfo = { cartons: Number(findPcs.exec(parcelRaw)[1]), lines: [] }
    let results = findInfo.exec(parcelRaw);
    while (results !== null) {
        parcelInfo.lines.push(results.groups);
        results = findInfo.exec(parcelRaw);
    }
    // console.log(JSON.stringify(parcelInfo));
    navigator.clipboard.writeText(JSON.stringify(parcelInfo));
    // return JSON.stringify(parcelInfo);
}

/* Calculating the class of a freight pallet:
1. Multiply LxWxH to get total cubic measurement
2. If measuring in inches (which we do), divide by 1728 to get cubic feet
3. Divide the weight in pounds by the cubic feet to get the density
4. The density will determine the class of the pallet based on a table,
but the table does not account for factors such as handling, liability, or stow-ability
 
I suspect that the NS script is already doing this calculation,
and without additional information I can't further determine the class of the pallet.
I would need an example of the freight class being wrong to make further deductions.
 
I received an example of a freight class being wrong, I'm not actually sure WHY,
but it's definitely calculating incorrectly. Table below is the freight class table
Less than 1:	        400
1 but less than 2:	    300
2 but less than 4:	    250
4 but less than 6:	    175
6 but less than 8:	    125
8 but less than 10:	    100
10 but less than 12:	92.5
12 but less than 15:	85
15 but less than 22.5:	70
22.5 but less than 30:	65
Over 30:                60
*/

function getFreightClass(density) {
    if (density < 1) return 400;
    if (density < 2) return 300;
    if (density < 4) return 250;
    if (density < 6) return 175;
    if (density < 8) return 125;
    if (density < 10) return 100;
    if (density < 12) return 92.5;
    if (density < 15) return 85;
    if (density < 22.5) return 70;
    if (density < 30) return 65;
    return 60; // Over 30
}

function copyFreightInfo() {
    const cleanTags = new RegExp('</*(?:u|b)>', 'g');
    const findPcs = new RegExp(/Total Pallet Quantity: (\d+)/, 'g');
    const findInfo = new RegExp(/Qty: (?<qty>\d+), (?<lbs>[\d\.]+) lbs, (?<len>[\d\.]+) x (?<wid>[\d\.]+) x (?<hgt>[\d\.]+) in<br \/>Freight Class: (?<cls>[\d\.]+)/, 'g');
    let freightRaw = orderInfo.getElementsByTagName("custrecord_sq_quoted_freight_pkg")[0].textContent;
    freightRaw = freightRaw.replaceAll(cleanTags, '');
    const freightInfo = { cartons: Number(findPcs.exec(freightRaw)[1]), lines: [] }
    let results = findInfo.exec(freightRaw);
    while (results !== null) {
        freightInfo.lines.push(results.groups);
        results = findInfo.exec(freightRaw);
    }
    freightInfo.lines.forEach((line) => {
        // Multiply LxWxH to get total cubic measurement, divide by 1728 to get cubic feet
        const cubicFeet = (Number(line.len) * Number(line.wid) * Number(line.hgt)) / 1728;
        console.log(`Cubic Feet: ${cubicFeet}`);
        // Divide the weight in pounds by the cubic feet to get the density
        const density = line.lbs / cubicFeet;
        console.log(`Density: ${density}`);
        // Get the freight class based on the density
        line.cls = `${getFreightClass(density)}`;
    });
    // console.log(JSON.stringify(freightInfo));
    navigator.clipboard.writeText(JSON.stringify(freightInfo));
    // return JSON.stringify(freightInfo);
}

function calcShipDiff(type = "PAvF") {
    const parcelQuote = orderInfo.getElementsByTagName("custrecord_sq_parcel_quote")[0].textContent;
    const freightQuote = orderInfo.getElementsByTagName("custrecord_sq_freight_quote")[0].textContent;
    const premiumQuote = orderInfo.getElementsByTagName("custrecord_sq_quoted_freight_rates")[0].textContent.replaceAll(/(?:<\/*b>)|(?:<br>)/g, '').match(/Premium, Quoted Rate: (\d+\.\d+)/)?.[1];
    if (type == "PAvF") {
        const diff = Number(freightQuote) - Number(parcelQuote);
        if (diff > 0) {
            // console.log(`Freight is more expensive by $${diff.toFixed(2)}`);
            return `Freight is $${diff.toFixed(2)} more than Parcel.`;
        } else if (diff < 0) {
            // console.log(`Parcel is more expensive by $${(-diff).toFixed(2)}`);
            return `Parcel is $${(-diff).toFixed(2)} more than Freight.`;
        } else {
            // console.log("Parcel and Freight quotes are the same.");
            return "Parcel and Freight quotes are the same.";
        }
    }
    if (type == "FvPR") {
        if (!premiumQuote) {
            return "No Premium Rate found.";
        }
        const diff = Number(freightQuote) - Number(premiumQuote);
        if (diff > 0) {
            // console.log(`Premium Rate is cheaper by $${diff.toFixed(2)}`);
            return `Premium Rate is $${diff.toFixed(2)} cheaper than Freight.`;
        } else if (diff < 0) {
            // console.log(`Freight is cheaper by $${(-diff).toFixed(2)}`);
            return `Premium Rate $${(-diff).toFixed(2)} more than Freight.`;
        } else {
            // console.log("Freight and Premium Rate quotes are the same.");
            return "Freight and Premium Rate quotes are the same.";
        }
    }
    if (type == "PAvPR") {
        if (!premiumQuote) {
            return "No Premium Rate found.";
        }
        const diff = Number(premiumQuote) - Number(parcelQuote);
        if (diff > 0) {
            // console.log(`Parcel is more expensive by $${diff.toFixed(2)}`);
            return `Parcel is $${diff.toFixed(2)} more than Premium Rate.`;
        } else if (diff < 0) {
            // console.log(`Premium Rate is more expensive by $${(-diff).toFixed(2)}`);
            return `Premium Rate is $${(-diff).toFixed(2)} more than Parcel.`;
        } else {
            // console.log("Parcel and Premium Rate quotes are the same.");
            return "Parcel and Premium Rate quotes are the same.";
        }
    }
    return "Invalid type specified.";
}

function createParcelButton() {
    const parcelButton = document.createElement("button");
    parcelButton.id = "parcelbutton";
    parcelButton.innerHTML = "Copy Parcel Info";
    parcelButton.style.marginLeft = "12px";
    parcelButton.addEventListener("click", () => {
        copyParcelInfo();
    });
    return parcelButton;
}

function createFreightButton() {
    const freightButton = document.createElement("button");
    freightButton.id = "freightbutton";
    freightButton.innerHTML = "Copy Freight Info";
    freightButton.addEventListener("click", () => {
        copyFreightInfo();
    });
    return freightButton;
}

function createButtons() {
    const fBtn = createFreightButton();
    const pBtn = createParcelButton();
    const btnCont = document.createElement("div");
    btnCont.appendChild(pBtn);
    btnCont.appendChild(fBtn);
    btnCont.style.display = "flex";
    btnCont.style.gap = "8px";
    document.querySelector("#div__body").after(btnCont);
}

function insertShipDiffs() {
    const diffPAvFText = calcShipDiff();
    const diffPAvF = document.createElement("tr");
    diffPAvF.class = "uir-field-wrapper-cell";
    diffPAvF.id = "shipdiff";
    diffPAvF.innerHTML = `<td> <div class="uir-field-wrapper uir-long-text" data-nsps-label="Freight Quote Difference" data-nsps-type="field" > <span id="custcustrecord_shipdiff" class="smallgraytextnolink uir-label" data-nsps-type="field_label" ><span id="custrecord_sq_shipquote_notes_fs_lbl" class="uir-label-span smallgraytextnolink" style="" data-nsps-type="label" ><a tabindex="-1" title="What's this?" href='javascript:void("help")' style="cursor: help" class="smallgraytextnolink uir-no-link" onmouseover="setFirstClassName(this, 'smallgraytext'); return true;" onmouseout="setFirstClassName(this, 'smallgraytextnolink'); " >Ship Quote Difference</a > </span></span ><span class="uir-field inputreadonly uir-resizable" data-nsps-type="field_input" data-field-type="textarea" > ${diffPAvFText} </span> </div> </td>`;
    diffPAvF.style.marginTop = "12px";

    const diffFvPRText = calcShipDiff("FvPR");
    const diffFvPR = document.createElement("tr");
    diffFvPR.class = "uir-field-wrapper-cell";
    diffFvPR.id = "shipdiff2";
    diffFvPR.innerHTML = `<td> <div class="uir-field-wrapper uir-long-text" data-nsps-label="Freight vs Premium Rate Difference" data-nsps-type="field" > <span id="custcustrecord_shipdiff2" class="smallgraytextnolink uir-label" data-nsps-type="field_label" ><span id="custrecord_sq_shipquote_notes_fs_lbl" class="uir-label-span smallgraytextnolink" style="" data-nsps-type="label" ><a tabindex="-1" title="What's this?" href='javascript:void("help")' style="cursor: help" class="smallgraytextnolink uir-no-link" onmouseover="setFirstClassName(this, 'smallgraytext'); return true;" onmouseout="setFirstClassName(this, 'smallgraytextnolink'); " >Freight vs Premium Rate Difference</a > </span></span ><span class="uir-field inputreadonly uir-resizable" data-nsps-type="field_input" data-field-type="textarea" > ${diffFvPRText} </span> </div> </td>`;

    const diffPAvPRText = calcShipDiff("PAvPR");
    const diffPAvPR = document.createElement("tr");
    diffPAvPR.class = "uir-field-wrapper-cell";
    diffPAvPR.id = "shipdiff3";
    diffPAvPR.innerHTML = `<td> <div class="uir-field-wrapper uir-long-text" data-nsps-label="Parcel vs Premium Rate Difference" data-nsps-type="field" > <span id="custcustrecord_shipdiff3" class="smallgraytextnolink uir-label" data-nsps-type="field_label" ><span id="custrecord_sq_shipquote_notes_fs_lbl" class="uir-label-span smallgraytextnolink" style="" data-nsps-type="label" ><a tabindex="-1" title="What's this?" href='javascript:void("help")' style="cursor: help" class="smallgraytextnolink uir-no-link" onmouseover="setFirstClassName(this, 'smallgraytext'); return true;" onmouseout="setFirstClassName(this, 'smallgraytextnolink'); " >Parcel vs Premium Rate Difference</a > </span></span ><span class="uir-field inputreadonly uir-resizable" data-nsps-type="field_input" data-field-type="textarea" > ${diffPAvPRText} </span> </div> </td>`;
    document.querySelector("#main_form > table > tbody > tr > td > table > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(4)").after(diffPAvF);
    document.querySelector("#shipdiff").after(diffFvPR);
    document.querySelector("#shipdiff2").after(diffPAvPR);

}
/////////////////////////////////////End PJ Quote Functions/////////////////////////////////////
///////////////////////////////////////Begin GP Functions//////////////////////////////////////
function createInputDiv() {
    const prevDiv = document.querySelector("[data-field-name='custrecord_gp_summary']").parentElement;
    // May need to apply a width to above element to keep size down
    prevDiv.style.width = "260px";
    const inputDiv = document.createElement("td");
    // inputDiv.style = "width: 50px; display: grid; grid-template-columns: repeat(1, 1fr); grid-gap: 10px; align-items: center; margin: 20px;";
    // Need to wrap final amounts in span if possible or make the p elements inline
    inputDiv.innerHTML = `<div
      style="
        width: 50px;
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        grid-gap: 10px;
        align-items: center;
        margin: 20px;
      "
    >
      <div>
        <span
          class="uir-field inputreadonly uir-user-styled uir-resizable"
          data-nsps-type="field_input"
          data-field-type="textarea"
          ><b>Final GP $: </b>
          <p id="finalGrossProfit" style="display: inline">0.00</p>
          <br />
          <b>Final GP %: </b>
          <p id="finalGrossProfitPercent" style="display: inline">0.00</p></span
        >
      </div>
      <input type="number" id="invoicedAmount" placeholder="Invoiced Amount" />
      <input type="number" id="poCosts" placeholder="PO Costs" />
      <input type="number" id="stockCosts" placeholder="Stock Costs" />
      <input type="number" id="shippingCosts" placeholder="Shipping Costs" />
      <input type="number" id="installCosts" placeholder="Install Costs" />
    </div>`;
    inputDiv.id = "gpinputdiv";
    prevDiv.after(inputDiv);
}

function setGrossProfit(change) {
    // custrecord_gp_date indicates there's a final calculation
    // custrecord_gp_date_created indicates if there is an SO
    // custrecord_gp_quote_date_created indicates if there is a quote

    let orderState;
    let finalAmount;
    if (orderInfo.getElementsByTagName(`custrecord_gp_date`)[0]) {
        orderState = "";
        finalAmount = "custrecord_gp_invoice";
    } else if (orderInfo.getElementsByTagName(`custrecord_gp_date_created`)[0]) {
        orderState = "est_";
        finalAmount = "custrecord_gp_so_amount";
    } else if (orderInfo.getElementsByTagName(`custrecord_gp_quote_date_created`)[0]) {
        orderState = "quote_";
        finalAmount = "custrecord_gp_quote_amount";
    }

    console.log(orderState);
    // These values are pulled from the XML
    // This first value is actually custrecord_gp_so_amount on an uninvoiced SO and custrecord_gp_quote_amount on an EST
    let invoicedAmount = Number(orderInfo.getElementsByTagName(finalAmount)[0].textContent);
    let poCosts = Number(orderInfo.getElementsByTagName(`custrecord_gp_${orderState}po`)[0].textContent);
    let stockCosts = Number(orderInfo.getElementsByTagName(`custrecord_gp_${orderState}item`)[0].textContent);
    let shippingCosts = Number(orderInfo.getElementsByTagName(`custrecord_gp_${orderState}ship`)[0].textContent);
    let installCosts = Number(orderInfo.getElementsByTagName(`custrecord_gp_${orderState}install`)[0].textContent);

    // Values from the input fields override the XML values if they are provided.
    const invoicedInput = document.getElementById("invoicedAmount").value;
    const poInput = document.getElementById("poCosts").value;
    const stockInput = document.getElementById("stockCosts").value;
    const shippingInput = document.getElementById("shippingCosts").value;
    const installInput = document.getElementById("installCosts").value;

    if (invoicedInput !== "") {
        invoicedAmount = Number(invoicedInput);
    }
    if (poInput !== "") {
        poCosts = Number(poInput);
    }
    if (stockInput !== "") {
        stockCosts = Number(stockInput);
    }
    if (shippingInput !== "") {
        shippingCosts = Number(shippingInput);
    }
    if (installInput !== "") {
        installCosts = Number(installInput);
    }

    // Final values to use on page
    const finalGPUSD = invoicedAmount - (poCosts + stockCosts + shippingCosts + installCosts);
    const finalGPPercent = (finalGPUSD / invoicedAmount) * 100;

    const finalGPUSDElement = document.querySelector("#finalGrossProfit");
    const finalGPPercentElement = document.querySelector("#finalGrossProfitPercent");

    finalGPUSDElement.textContent = finalGPUSD.toFixed(2);
    finalGPPercentElement.textContent = finalGPPercent.toFixed(2);
}

function setListeners() {
    const inputs = document.querySelectorAll("#gpinputdiv input");
    inputs.forEach(input => {
        input.addEventListener("input", setGrossProfit);
    });
}
/////////////////////////////////////////End GP Functions//////////////////////////////////////
/////////////////////////////////////Begin Common Functions///////////////////////////////////
let orderInfo;
async function grabXML() {
    const response = await fetch(`${url}&xml=T`);
    const data = await response.text();
    const parser = new DOMParser();
    // console.log(data);

    const parsedDoc = parser.parseFromString(data, "text/xml");
    const xmlString = new XMLSerializer().serializeToString(parsedDoc);
    // console.log(parsedDoc);
    // console.log(parsedDoc.getElementsByTagName("custrecord_sq_quoted_parcel_pkg")[0].textContent);
    // console.log(parsedDoc.getElementsByTagName("custrecord_sq_quoted_freight_pkg")[0].textContent);
    orderInfo = parsedDoc;

    if (url.includes(pjCheck)) {
        createButtons();
        // copyParcelInfo();
        // copyFreightInfo();
        insertShipDiffs();
    }

    if (url.includes(gpCheck)) {
        createInputDiv();
        setGrossProfit();
        setListeners();
    }
}
grabXML();
