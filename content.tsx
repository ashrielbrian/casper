import React, { useEffect } from "react"

const extractHtmlBody = () => {
    return document.body.outerHTML;
}

const zip = <T, U>(a: T[], b: U[]): [number, T, U][] => a.map((ele, idx) => [idx, ele, b[idx]])

const isRandomlyBelow = (threshold = 0.05) => {
    // returns true (threshold * 100)% of the time
    return Math.random() <= threshold;
}


const extractHeadersAndParagraphs = (htmlContent: string) => {
    const MIN_CHAR_LIMIT = 30;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const paragraphs = doc.querySelectorAll('p');
    const listItems = doc.querySelectorAll('li');

    // Extract the text content of the headers and paragraphs
    const headerTexts = Array.from(headers).map(header => header.textContent.trim()).filter(header => header.length > MIN_CHAR_LIMIT);
    const paragraphTexts = Array.from(paragraphs).map(paragraph => paragraph.textContent.trim()).filter(paragraph => paragraph.length > MIN_CHAR_LIMIT);
    const listItemsTexts = Array.from(listItems).map(items => items.textContent.trim()).filter(items => items.length > MIN_CHAR_LIMIT);

    return {
        headers: headerTexts,
        paragraphs: paragraphTexts,
        listItems: listItemsTexts
    };
}

const PlasmoOverlay = () => {

    useEffect(() => {

        // grab only the headers and paragraphs from the webpage
        const webpageBodyContent = extractHtmlBody();
        const { headers, paragraphs, listItems } = extractHeadersAndParagraphs(webpageBodyContent);

        const processPage = async () => {
            // const backgroundResponse = await processPageInBackground(location.href, [...headers, ...paragraphs, ...listItems])
            // console.log("Page has been processed. Background response: ", backgroundResponse)
        }

        const cleanUp = async () => {
            if (isRandomlyBelow(0.05)) {
                const backgroundResponse = await cleanUpUrlEmbeddings();
                console.log("Delete check ran. Background response:", backgroundResponse);
            }
        }

        processPage().catch(console.error);
        cleanUp().catch(console.error)

    }, [])

    return null;
}

const cleanUpUrlEmbeddings = async () => {
    return await chrome.runtime.sendMessage({ type: "clean_up" })
}

export const processPageInBackground = async (url: string, webHeadersAndParas: string[]) => {
    return await chrome.runtime.sendMessage({ type: "process_page", url, textChunks: webHeadersAndParas })
}

export default PlasmoOverlay
