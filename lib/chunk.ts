

export const extractHeadersAndParagraphs = (htmlContent: string) => {
    const MIN_CHAR_LIMIT = 5;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    // const paragraphs = doc.querySelectorAll('p');
    // const listItems = doc.querySelectorAll('li');

    const relevantTags = ['h1', 'h2', "h3", "h4", "h5", 'h6', 'p', 'li']
    const nodes = [];

    const traverseNode = (node: Element) => {
        if (relevantTags.includes(node.tagName.toLowerCase())) {
            nodes.push({
                content: node.textContent.trim(),
                tag: node.tagName.toLowerCase(),
                id: node.id
            });
        }

        if (node.hasChildNodes()) {
            for (let childNode of node.children) {
                traverseNode(childNode);
            }
        }
    }

    traverseNode(doc.body)

}