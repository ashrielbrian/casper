import { PGlite } from "dist/electric-sql/index.js";
import { vector } from 'dist/electric-sql/vector/index.js';
import { worker } from 'dist/electric-sql/worker/index.js'


// TODO: instantiate database
// TODO: setup pipeline instance when the extension starts
// TODO: when a new webpage is visited,
//          1. send message with html from content to background
//          2. background worker runs the pipeline
//          3. embeddings stored in pglite
// TODO: add a search bar in the popup.tsx fires a search of the pglite instance and returns its results
// TODO: add a deletion expiry

worker({
    async init() {
        const pg = new PGlite('idb://casper.db', {
            extensions: {
                vector,
            },
        });
        // If you want run any specific setup code for the worker process, you can do it here.
        return pg;
    },
});

console.log("Service worker has the PGlite worker started.")

// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//     console.log("background received:", message)
//     if (message.type === "get_html_embedding") {

//         const pipeline = await PipelineSingleton.getInstance((x) => {
//             console.log("Progress update", x)
//         });

//         // get the db instance 
//         // const db = getDB();

//         // TODO: get the URL. if the URL has been visited before, don't generate embeddings
//         const sourceUrl = sender.url;

//         const htmlContent = message.payload;

//         console.log("from bg:", sourceUrl, htmlContent)

//         // TODO: chunk the HTML content here

//         // pass the chunks into the embeddings func
//         sendResponse({ ok: true, error: null })

//         // Keep the message channel open for async response
//         return true;
//     }

// })
