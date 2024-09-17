export { }

import { pipeline, env, type PipelineType } from "@xenova/transformers";

// IMPORTANT: see this issue https://github.com/microsoft/onnxruntime/issues/14445#issuecomment-1625861446
env.backends.onnx.wasm.numThreads = 1;

import { getDB } from "~db";

// TODO: instantiate database
// TODO: setup pipeline instance when the extension starts
// TODO: when a new webpage is visited,
//          1. send message with html from content to background
//          2. background worker runs the pipeline
//          3. embeddings stored in pglite
// TODO: add a search bar in the popup.tsx fires a search of the pglite instance and returns its results
// TODO: add a deletion expiry

class PipelineSingleton {
    static task = "feature-extraction" as PipelineType;
    static model = "Supabase/gte-small";
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                progress_callback,
                // dtype: "fp32",
                // device: !!navigator.gpu ? "webgpu" : "wasm"
            })
        }
        return this.instance;
    }
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log("background received:", message)
    if (message.type === "get_html_embedding") {

        const pipeline = await PipelineSingleton.getInstance((x) => {
            console.log("Progress update", x)
        });

        // get the db instance 
        const db = getDB();

        // TODO: get the URL. if the URL has been visited before, don't generate embeddings
        const sourceUrl = sender.url;

        const htmlContent = message.payload;

        console.log("from bg:", sourceUrl, htmlContent)

        // TODO: chunk the HTML content here

        // pass the chunks into the embeddings func
        sendResponse({ ok: true, error: null })

        // Keep the message channel open for async response
        return true;
    }

})

