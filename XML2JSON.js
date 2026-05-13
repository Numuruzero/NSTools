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

async function grabXMLasJSON(url) {
    try {
        const response = await fetch(`${url}&xml=T`);
        const data = await response.text();
        const parser = new DOMParser();

        const parsedDoc = parser.parseFromString(data, "text/xml");
        return xmlToObj(parsedDoc.documentElement);
    } catch (error) {
        console.error("Error fetching or parsing XML:", error);
    }
}
