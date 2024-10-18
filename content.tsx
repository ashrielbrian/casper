import React, { useEffect } from "react"
import { parseChunkHtmlContent } from '~/lib/chunk';

const extractHtmlBody = () => {
    return document.body.outerHTML;
}

const zip = <T, U>(a: T[], b: U[]): [number, T, U][] => a.map((ele, idx) => [idx, ele, b[idx]])

const isRandomlyBelow = (threshold = 0.05) => {
    // returns true (threshold * 100)% of the time
    return Math.random() <= threshold;
}

const PlasmoOverlay = () => {

    useEffect(() => {

        // grab only the headers and paragraphs from the webpage
        const webpageBodyContent = extractHtmlBody();
        // const { headers, paragraphs, listItems } = extractHeadersAndParagraphs(webpageBodyContent);
        const chunks = parseChunkHtmlContent(webpageBodyContent);

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
