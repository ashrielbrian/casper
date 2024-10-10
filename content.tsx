import React, { useEffect } from "react"

const extractHtmlBody = () => {
    return document.body.outerHTML;
}

const zip = <T, U>(a: T[], b: U[]): [number, T, U][] => a.map((ele, idx) => [idx, ele, b[idx]])

const extractHeadersAndParagraphs = (htmlContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const paragraphs = doc.querySelectorAll('p');

    // Extract the text content of the headers and paragraphs
    const headerTexts = Array.from(headers).map(header => header.textContent.trim());
    const paragraphTexts = Array.from(paragraphs).map(paragraph => paragraph.textContent.trim());

    return {
        headers: headerTexts,
        paragraphs: paragraphTexts
    };
}

const PlasmoOverlay = () => {

    useEffect(() => {

        // grab only the headers and paragraphs from the webpage
        const webpageBodyContent = extractHtmlBody();
        const { headers, paragraphs } = extractHeadersAndParagraphs(webpageBodyContent);

        const processPage = async () => {

            console.log(headers[0])

            const backgroundResponse = await processPageInBackground(location.href, [...headers, ...paragraphs])

            console.log("Page has been processed. Background response: ", backgroundResponse)
        }
        processPage().catch(console.error)

    }, [])

    return null;
}

export const processPageInBackground = async (url: string, webHeadersAndParas: string[]) => {
    return await chrome.runtime.sendMessage({ type: "process_page", url, textChunks: webHeadersAndParas })
}

export default PlasmoOverlay
