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
            try {
                const chunks = await parseChunkHtmlContent(webpageBodyContent);
                await processPageInBackground(location.href, chunks)
            } catch (err) {
                console.error("Failed to process page:", err);
            }
        }

        const cleanUp = async () => {
            try {
                if (isRandomlyBelow(0.05)) {
                    await cleanUpUrlEmbeddings();
                }
            } catch (err) {
                console.error("Cleanup failed:", err);
            }
        }

        processPage();
        cleanUp();

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
