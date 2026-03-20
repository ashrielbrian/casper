export { }

import { getDB, getOrCreatePage, lockAndRunPglite, deletePagesOlderThan, storeEmbeddings, urlIsPresentOrInDatetimeRange } from "~db";
import { pipeline, env, type PipelineType } from "@xenova/transformers";
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
            })
        }
        return this.instance;
    }
}

const getLLMPipeline = async () => {
    return await PipelineSingleton.getInstance();
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

    if (message.type === "process_page") {

        const { type, url, textChunks }: { type: string, url: string, textChunks: Chunk[] } = message;

        (async () => {
            try {
                const urlIsPresent = await lockAndRunPglite(urlIsPresentOrInDatetimeRange, { url });

                if (urlIsPresent) {
                    sendResponse({ ok: true, error: null, msg: `URL ${url} has been processed before. Skipping...` })
                } else if (textChunks.length <= 0) {
                    sendResponse({ ok: false, error: null, msg: `No chunks sent.` })
                } else {
                    const llmPipeline = await getLLMPipeline();

                    await navigator.locks.request("pglite", async () => {
                        const pg = await getDB();
                        const pageId = await getOrCreatePage(pg, url);

                        for (const chunk of textChunks) {
                            const embedding = await runInference(llmPipeline, chunk.content);
                            await storeEmbeddings(pg, pageId, chunk, embedding);
                        }
                    });

                    sendResponse({ ok: true, error: null, msg: `Done processing ${textChunks.length} chunks.` })
                }
            } catch (err) {
                sendResponse({ ok: false, error: String(err), msg: "process_page failed" })
            }
        })()
    } else if (message.type === "get_embedding") {
        (async () => {
            try {
                const { chunk } = message;
                const llmPipeline = await getLLMPipeline();
                const embedding = await runInference(llmPipeline, chunk);

                sendResponse({ ok: true, error: null, embedding })
            } catch (err) {
                sendResponse({ ok: false, error: String(err), embedding: null })
            }
        })()
    } else if (message.type === "clean_up") {
        (async () => {
            try {
                await lockAndRunPglite(deleteIfUrlIsExpired, {});
                sendResponse({ ok: true, error: null })
            } catch (err) {
                sendResponse({ ok: false, error: String(err) })
            }
        })()
    }

    // IMPORTANT: Keeps the message channel open for async response
    return true;
})
