import { useEffect, useState } from "react"


const extractHtmlBody = () => {
    return document.body.outerHTML;
}
const PlasmoOverlay = () => {
    useEffect(() => {
        const webpageBodyContent = extractHtmlBody();
        console.log(webpageBodyContent)
        chrome.runtime.sendMessage({ type: "get_html_embedding", payload: webpageBodyContent }, (backgroundResponse) => {
            console.log("Response from the worker", backgroundResponse);
            return true;
        })
    }, [])

    return;
}

export default PlasmoOverlay
