import React, { useEffect } from "react"
import { parseChunkHtmlContent, type Chunk } from '~/lib/chunk';

const extractHtmlBody = () => {
    return document.body.outerHTML;
}

const isRandomlyBelow = (threshold = 0.05) => {
    // returns true (threshold * 100)% of the time
    return Math.random() <= threshold;
}

const PlasmoOverlay = () => {

    useEffect(() => {

        const webpageBodyContent = extractHtmlBody();

        const processPage = async () => {
            const chunks = await parseChunkHtmlContent(webpageBodyContent);
            const backgroundResponse = await processPageInBackground(location.href, chunks)
            console.log("Page has been processed. Background response: ", backgroundResponse)
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

export const processPageInBackground = async (url: string, chunks: Chunk[]) => {
    return await chrome.runtime.sendMessage({ type: "process_page", url, textChunks: chunks })
}

export default PlasmoOverlay
