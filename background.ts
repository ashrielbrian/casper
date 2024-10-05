export { }

import { pipeline, env, type PipelineType } from "@xenova/transformers";

// IMPORTANT: see this issue https://github.com/microsoft/onnxruntime/issues/14445#issuecomment-1625861446
env.backends.onnx.wasm.numThreads = 1;

class PipelineSingleton {
    // TODO: is it possible to ensure there's only a single instance of transformers Pipeline, and each worker reuses the same Pipeline?
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

        const sourceUrl = sender.url;
        const chunk = message.payload;

        console.log("from bg:", sourceUrl, chunk)

        // generate embeddings for each chunk
        const output = await pipeline(chunk, {
            pooling: "mean",
            normalize: true,
        });

        // Extract the embedding output
        const embedding = Array.from(output.data);

        console.log("Generated embedding: ", embedding.length)

        // return the embedding vector to the main thread
        sendResponse({ ok: true, error: null, embedding, chunk })

        // Keep the message channel open for async response
        return true;
    }

})

