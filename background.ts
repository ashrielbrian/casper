export { }

import { getDB, getUrlId, lockAndRunPglite, deletePagesOlderThan, storeEmbeddings, urlIsPresentOrInDatetimeRange } from "~db";
import { pipeline, env, type PipelineType } from "@xenova/transformers";
import { PGliteWorker } from "~dist/electric-sql/worker";
import type { Chunk } from "~lib/chunk";
import { MODEL_TYPE } from "~lib/chunk";

// IMPORTANT: see this issue https://github.com/microsoft/onnxruntime/issues/14445#issuecomment-1625861446
env.backends.onnx.wasm.numThreads = 1;

class PipelineSingleton {
    // TODO: is it possible to ensure there's only a single instance of transformers Pipeline, and each worker reuses the same Pipeline?
    static task = "feature-extraction" as PipelineType;
    static model = MODEL_TYPE;
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

const getLLMPipeline = async () => {
    return await PipelineSingleton.getInstance((x) => {
        console.log("Progress update", x)
    });
}

const runInference = async (pipeline, chunk: string) => {
    const output = await pipeline(chunk, {
        pooling: "mean",
        normalize: true,
    });

    const embedding = Array.from(output.data) as number[];
    return embedding;
}

const deleteIfUrlIsExpired = async ({ db }) => {
    return await deletePagesOlderThan(db);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // check the URL - if it exists, check if age of the URL. if older than a day, delete the old entries, chunk new and get new embs
    if (message.type === "process_page") {

        const { type, url, textChunks }: { type: string, url: string, textChunks: Chunk[] } = message;

        (async () => {
            const urlIsPresent = await lockAndRunPglite(urlIsPresentOrInDatetimeRange, { url });

            if (urlIsPresent) {
                // URL exists OR is still valid. Do not process, and return.
                sendResponse({ ok: true, error: null, msg: `URL ${url} has been processed before. Skipping...` })
            } else {
                const urlId = await lockAndRunPglite(getUrlId, { url });
                const pipeline = await getLLMPipeline();

                if (textChunks.length <= 0) {
                    sendResponse({ ok: false, error: null, msg: `No chunks sent.` })
                } else {
                    navigator.locks.request("pglite", async (lock) => {
                        let pg = await getDB()
                        for (let chunk of textChunks) {
                            let embedding = await runInference(pipeline, chunk.content);
                            await storeEmbeddings(pg, urlId, chunk, embedding);
                        }

                        sendResponse({ ok: true, error: null, msg: `Done processing ${textChunks.length} chunks.` })
                    })
                }
            }
        })()
    } else if (message.type === "get_embedding") {
        (async () => {
            const { chunk } = message;
            const pipeline = await getLLMPipeline();
            let embedding = await runInference(pipeline, chunk);

            sendResponse({ ok: true, error: null, embedding })
        })()
    } else if (message.type === "clean_up") {
        (async () => {
            await lockAndRunPglite(deleteIfUrlIsExpired, {});

            sendResponse({ ok: true, error: null })
        })()
    }

    // IMPORTANT: Keeps the message channel open for async response
    return true;
})
