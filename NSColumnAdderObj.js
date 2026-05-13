const tableElement = document.querySelector("#div__body");

// This should be a 2D array of table cell elements including a header
function captureTableCells(tableElement) {
    const rows = tableElement.querySelectorAll("tr");
    const data = [];
    rows.forEach(row => {
        const cols = row.querySelectorAll("td,th");
        const rowData = [];
        cols.forEach(col => {
            rowData.push(col);
        });
        data.push(rowData);
    });
    return data;
}

function addNewColumn(headerText = "New Data") {
    const table = captureTableCells(tableElement);
    const last = table[0].length - 1;

    table.forEach((row, rowIndex) => {
        if (row[last]) {
            const newCell = row[last].cloneNode(false);
            newCell.textContent = "";
            if (rowIndex === 0) {
                newCell.textContent = headerText;
            }
            row[last].after(newCell);
        }
    });
}

// Simple recursive helper to convert XML nodes to a JSON object
function xmlToObj(node) {
    let obj = {};

    for (let child of node.children) {
        if (child.children.length > 0) {
            if (child?.attributes?.name) {
                obj[child.attributes.name.value] = xmlToObj(child);
                continue; // Skip the default nodeName assignment for named nodes
            }
            if (obj[child.nodeName]) {
                // If we've already seen this nodeName, we need to convert it to an array (if it isn't one already) and push the new value
                if (!Array.isArray(obj[child.nodeName])) {
                    obj[child.nodeName] = [obj[child.nodeName]];
                }
                obj[child.nodeName].push(xmlToObj(child));
            } else {
                obj[child.nodeName] = xmlToObj(child);
            }
        } else {
            // We're assuming there are no terminating nodes with repeated names
            if (child?.attributes?.name) {
                obj[child.attributes.name.value] = child.textContent;
                continue; // Skip the default nodeName assignment for named nodes
            }
            obj[child.nodeName] = child.textContent;
        }
    }
    return obj;
}

function getInfo(obj, reqKey) {
    try {
        console.log(`Getting info for key: "${reqKey}"`);
        if (reqKey.includes("[") || reqKey.includes("{")) {
            // Handle complex key access
            const regex = /([\[{]\w+[\]}])/g;
            const subKeys = [...reqKey.matchAll(regex)].map(match => match[1]);
            const baseKey = reqKey.split(/[\[{]/)[0];
            let current = obj[baseKey];
            for (let key of subKeys) {
                if (key.startsWith("[")) {
                    if (current?.[key.slice(1, -1)] !== undefined) {
                        console.log(`Accessing key: ${key.slice(1, -1)}`);
                        current = current[key.slice(1, -1)];
                    } else {
                        return "N/A";
                    }
                } else if (key.startsWith("{")) {
                    // For arrays with curly braces, we'll return a new array with the subkey values
                    // If we're looking at an array, return that new array
                    if (Array.isArray(current)) {
                        const infoArray = [];
                        for (let item of current) {
                            if (item?.[key.slice(1, -1)] !== undefined) {
                                infoArray.push(item[key.slice(1, -1)]);
                            }
                        }
                        current = infoArray;
                    } else if (current?.[key.slice(1, -1)] !== undefined) {
                        // If it's not an array, just access it directly
                        console.log(`Accessing key: ${key.slice(1, -1)}`);
                        current = current[key.slice(1, -1)];
                    } else {
                        return "N/A";
                    }
                }
            }
            if (typeof current === "object") {
                current = JSON.stringify(current);
            }
            console.log(`Final value for complex key "${reqKey}":`, current);
            return current;
        } else {
            const result = obj?.[reqKey];
            if (result === undefined) {
                return "N/A";
            } else {
                return result;
            }
        }
    } catch (err) {
        console.error("Error in getInfo:", err);
        return "Error";
    }
}

let orderInfo;
let orderArchive = {};
async function grabXML(url, el, index) {
    let response = await fetch(`${url}&xml=T`, { redirect: "follow" });
    if (response.redirected) {
        // console.log("Redirected to:", response.url);
        response = await fetch(response.url + "&xml=T");
    }
    const data = await response.text();
    const parser = new DOMParser();

    const parsedDoc = parser.parseFromString(data, "text/xml");
    const docObj = xmlToObj(parsedDoc.documentElement);
    orderInfo = docObj.record; // Assuming the main data is under a "record" node, adjust as necessary
    console.log("Found doc");
    console.log(docObj);

    // Archiving the XMLs to avoid re-fetching
    if (!orderArchive?.[String(index)]) {
        orderArchive[String(index)] = orderInfo;
    };

    // After this point is the doing stuff part
    let info = getInfo(orderInfo, el);
    // console.log(info);
    return info;
}

function populateNewColumn(linkColIndex, dataElement) {
    const table = captureTableCells(tableElement);
    const last = table[0].length - 1;
    const lastRowIndex = table.length - 3;

    table.forEach((row, rowIndex) => {
        const linkCell = row[linkColIndex];
        if (row[last] && linkCell.querySelector("a") && rowIndex > 0) {
            const newCell = row[last];
            let url = linkCell.querySelector("a").href;
            const editIndex = url.indexOf("&e=T");
            if (editIndex !== -1) {
                url = url.slice(0, editIndex);
            }
            // console.log(`Processing row ${rowIndex} with URL: ${url}`);
            // Check for archived XML
            if (orderArchive?.[String(rowIndex)]) {
                try {
                    let info = getInfo(orderArchive[String(rowIndex)], dataElement);
                    newCell.textContent = info;
                } catch (err) {
                    newCell.textContent = "Error";
                }
            } else {
                grabXML(url, dataElement, rowIndex).then(info => {
                    newCell.textContent = info;
                    if (info === undefined) {
                        newCell.textContent = "N/A";
                    }
                }).catch(err => {
                    newCell.textContent = "Error";
                });
            }
        }
    });
}

function removeColumn(header) {
    const table = captureTableCells(tableElement);
    const headerRow = table[0];
    let headerIndex = -1;
    if (header) {
        headerIndex = headerRow.findIndex(cell => cell.textContent.toLowerCase().includes(header.toLowerCase()));
    }

    table.forEach((row, rowIndex) => {
        const cellToRemove = row.at(headerIndex);
        if (cellToRemove) {
            cellToRemove.remove();
        }

    });
}

function moveColumn(fromIndex, toIndex) {
    const table = captureTableCells(tableElement);
    table.forEach((row, rowIndex) => {
        const cellToMove = row.at(fromIndex);
        const targetCell = row.at(toIndex);

        if (cellToMove && targetCell) {
            const parentRow = cellToMove.parentElement;
            const targetParentRow = targetCell.parentElement;
            const targetCellIndex = Array.from(targetParentRow.children).indexOf(targetCell);
            // When we make the move, we'll put it after the target cell (i.e. so the initial column is AT the target index)
            if (fromIndex < toIndex) {
                parentRow.insertBefore(cellToMove, targetParentRow.children[targetCellIndex + 1]);
            } else {
                parentRow.insertBefore(cellToMove, targetParentRow.children[targetCellIndex]);
            }
        }
    });
}

const afterEl = document.getElementsByClassName("uir-filters")[0];

const controlDiv = document.createElement("div");
controlDiv.style.display = "flex";
controlDiv.style.flexDirection = "column";
controlDiv.style.alignItems = "flex-end";
controlDiv.style.marginBottom = "10px";
controlDiv.style.marginRight = "10px";
controlDiv.innerHTML = `<table><tr><th style="text-align: center" colspan="3">Move Column</th><th>&nbsp;</th><th>&nbsp;</th><th style="text-align: center">URL col#</th><th style="text-align: center">XML tag</th><th style="text-align: center">Header</th><th>&nbsp;</th></tr><tr><td><input id="fromcolumn" type="text" placeholder="From" style="width: 80px" /></td><td>to</td><td><input id="tocolumn" type="text" placeholder="To" style="width: 80px" /></td><td><button id="movecol">Go</button></td><td><button id="lesscol" style="width: 24px">-</button></td><td><input id="urlcolumn" type="text" placeholder="URL column" style="width: 80px" /></td><td><input id="xmltag" type="text" placeholder="XML tag" style="width: 80px" /></td><td><input id="header" type="text" placeholder="Header" style="width: 80px" /></td><td><button id="morecol" style="width: 24px">+</button></td></tr></table>`;
afterEl.after(controlDiv);
document.querySelector("#morecol").addEventListener("click", () => {
    preventDefault();
    stopPropagation();
    const headerText = document.querySelector("#header").value;
    addNewColumn(headerText);
    const urlColumn = document.querySelector("#urlcolumn").value - 1;
    const xmlTag = document.querySelector("#xmltag").value;
    populateNewColumn(urlColumn, xmlTag);
});
document.querySelector("#lesscol").addEventListener("click", () => {
    preventDefault();
    stopPropagation();
    const headerText = document.querySelector("#header").value;
    removeColumn(headerText);
});
document.querySelector("#movecol").addEventListener("click", () => {
    preventDefault();
    stopPropagation();
    const fromCol = document.querySelector("#fromcolumn").value - 1;
    const toCol = document.querySelector("#tocolumn").value - 1;
    moveColumn(fromCol, toCol);
});
