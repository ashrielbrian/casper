export { }

import { getDB, search, deletePagesOlderThan, type SearchResult } from "~db";
import { pipeline, env, type PipelineType } from "@xenova/transformers";
import { PGliteWorker } from "~dist/electric-sql/worker";
import type { Chunk } from "~lib/chunk";
import { MODEL_TYPE } from "~lib/chunk";

// IMPORTANT: see this issue https://github.com/microsoft/onnxruntime/issues/14445#issuecomment-1625861446
env.backends.onnx.wasm.numThreads = 1;

const getUrlId = async (worker: PGliteWorker, url: string) => {
    let res = await worker.query(`SELECT id FROM page WHERE url = $1`, [url]);
    console.log("URL ID: ", res.rows[0]);
    return res.rows.length > 0 ? res.rows[0].id : null
}

const storeEmbeddings = async (worker: PGliteWorker, urlId: string, chunk: Chunk, embedding: number[]) => {

    let embStr = `'[${embedding}]'`
    const insertRes = await worker.query(`INSERT INTO embedding (page_id, content, embedding, chunk_tag_id) VALUES ($1, $2, ${embStr}, $3);`,
        [urlId, chunk.content, chunk.id]
    );

    console.log("Inserted embedding", insertRes)
}

const urlIsPresentOrInDatetimeRange = async (worker: PGliteWorker, url: string, withinDays: number = 3) => {
    // fetch from db whether url exists and/or is within the required days
    // TODO: filter out URL for withinDays
    let res = await worker.query("SELECT id, createdAt FROM page WHERE url = $1", [url])

    if (res.rows.length > 0) {
        console.log(`url exist ${url} of rows: ${res.rows}`)
        return true;

    } else {
        let out = await worker.query("INSERT INTO page (url, title) VALUES ($1, $2)", [url, "test"]);
        console.log("Inserted into pages", out.affectedRows)
    }
    return false;
}

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

const deleteIfUrlIsExpired = async (worker: PGliteWorker) => {
    return await deletePagesOlderThan(worker);
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    const pg = await getDB();
    console.log(`Message is of type: ${message.type}`);


    // check the URL - if it exists, check if age of the URL. if older than a day, delete the old entries, chunk new and get new embs
    if (message.type === "process_page" && pg) {

        const { type, url, textChunks }: { type: string, url: string, textChunks: Chunk[] } = message;

        if (await urlIsPresentOrInDatetimeRange(pg, url)) {
            // URL exists OR is still valid. Do not process, and return.
            sendResponse({ ok: true, error: null, msg: `URL ${url} has been processed before. Skipping...` })
        } else {
            const urlId = await getUrlId(pg, url);
            const pipeline = await getLLMPipeline();

            console.log(`Background received type '${type}', at ${url} with ${textChunks.length} chunks.`);

            if (textChunks.length <= 0) {
                sendResponse({ ok: false, error: null, msg: `No chunks sent.` })
                return;
            }

            console.log(`Here is a sample chunks: ${textChunks[0]}`);
            for (let chunk of textChunks) {

                let embedding = await runInference(pipeline, chunk.content);
                console.log("Generated embedding: ", embedding.length)

                await storeEmbeddings(pg, urlId, chunk, embedding);
            }
            sendResponse({ ok: true, error: null, msg: `Done processing ${textChunks.length} chunks.` })
        }

    } else if (message.type === "get_embedding") {
        const { chunk } = message;
        const pipeline = await getLLMPipeline();

        let embedding = await runInference(pipeline, chunk);
        console.log("Generated embedding: ", embedding.length)

        sendResponse({ ok: true, error: null, embedding })
    } else if (message.type === "clean_up") {
        await deleteIfUrlIsExpired(pg);
        sendResponse({ ok: true, error: null })
    }

    // Keep the message channel open for async response
    return true;
})

