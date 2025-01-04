
import { PGlite } from "~dist/electric-sql";
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'
import { vector } from '~dist/electric-sql/vector';
import { extractDomain, zip } from "~lib/utils";
import type { Chunk } from "~lib/chunk";

// TODO: fix the content revalidation
// TODO: accept "" to get keyword search instead of semantic search

export interface SearchResult {
    id: number
    content: string,
    url: string,
    page_id: number,
    chunk_tag_id: string,
    prob: number
}

const DB_STORAGE = "idb://casper"

// TODO: add a Web Lock on dbInstance? so that whoever needs to use it needs to wait
let dbInstance;

export async function getDB() {
    if (dbInstance) {
        // Pglite instance exists. Reuse the instance
        await getDBName(dbInstance);
        return dbInstance;
    }

    console.log("Attempting to create pglite db")

    dbInstance = await PGlite.create(DB_STORAGE, {
        extensions: {
            vector
        },
        // relaxedDurability: false,
        // debug: 1
    })

    await initSchema(dbInstance);
    await getDBName(dbInstance)

    return dbInstance;
}

export const countRows = async (db, table) => {
    const res = await db.query(`SELECT COUNT(*) FROM ${table};`);
    return res.rows[0].count;
};

export const initSchema = async (db: PGlite) => {
    await db.exec(`
        --DROP TABLE IF EXISTS embedding;
        --DROP TABLE IF EXISTS page;
        --DROP TABLE IF EXISTS filters;
        --DROP TABLE IF EXISTS search_results_cache;

        CREATE EXTENSION IF NOT EXISTS vector;

        CREATE TABLE IF NOT EXISTS db(
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE
        );

        CREATE TABLE IF NOT EXISTS page(
            id SERIAL PRIMARY KEY,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT NOW(),
            url TEXT NOT NULL UNIQUE,
            title TEXT
        );

        CREATE TABLE IF NOT EXISTS embedding(
            id SERIAL PRIMARY KEY,
            page_id INT REFERENCES page(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            embedding vector(384),
            chunk_tag_id TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS filters(
            url TEXT NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS search_results_cache(
            id SERIAL PRIMARY KEY,
            embedding_id INT REFERENCES embedding(id) ON DELETE CASCADE,
            search_text TEXT NOT NULL,
            similarity FLOAT
        );

        CREATE INDEX IF NOT EXISTS page_created_at_index
        ON page(createdAt);

        CREATE INDEX ON embedding USING hnsw (embedding vector_ip_ops);

        CREATE INDEX IF NOT EXISTS filters_url_index
        ON filters(url);
    `)

    if (await countRows(db, "db") === 0) {
        let special = crypto.randomUUID();
        await db.query("INSERT INTO db(name) VALUES ($1) ON CONFLICT DO NOTHING", [special]);
    }

    if (await countRows(db, "filters") === 0) {
        await db.exec(`
            INSERT INTO filters(url)
            VALUES ('facebook.com'), ('x.com'), ('google.com'), ('youtube.com')
            ON CONFLICT DO NOTHING;
        `)
    }

    return;
}

export const getDBName = async (db: PGliteWorker) => {
    // await db.query(`
    //     CREATE TABLE IF NOT EXISTS db(
    //     id SERIAL PRIMARY KEY,
    //     name TEXT UNIQUE
    // );`);
    const res = await db.query('SELECT id, name FROM db;');

    const dbId = res.rows.length > 0 ? res.rows[0].name : null
    console.log("-------------- DATABASE UUID --------------")
    console.log(dbId);
    console.log("-------------- ------------- --------------")
}

export const lockAndRunPglite = async (cb, { ...options }) => {
    return await navigator.locks.request("pglite", async (lock) => {
        const pg = await getDB();
        const result = await cb({ db: pg, ...options });
        return result;
    })
}

export const storeEmbeddings = async (db: PGliteWorker, urlId: string, chunk: Chunk, embedding: number[]) => {

    let embStr = `'[${embedding}]'`
    const insertRes = await db.query(`INSERT INTO embedding (page_id, content, embedding, chunk_tag_id) VALUES ($1, $2, ${embStr}, $3);`,
        [urlId, chunk.content, chunk.id]
    );

    console.log("Inserted embedding", insertRes)
}

export const getUrlId = async ({ db, url }: { db: PGliteWorker, url: string }) => {
    let res = await db.query(`SELECT id FROM page WHERE url = $1`, [url]);
    return res.rows.length > 0 ? res.rows[0].id : null
}

export const urlIsPresentOrInDatetimeRange = async ({ db, url, withinDays = 3 }: { db: PGliteWorker, url: string, withinDays: number }) => {
    // fetch from db whether url exists and/or is within the required days
    // TODO: filter out URL for withinDays
    let res = await db.query("SELECT id, createdAt FROM page WHERE url = $1", [url])
    let filterSites = await getFilterSites(db);

    if (filterSites.includes(extractDomain(url))) {
        // skip processing this site as it is in the filtered sites list
        return true;
    }

    if (res.rows.length > 0) {
        console.log(`url exist ${url} of rows: ${res.rows}`)
        return true;

    } else {
        let out = await db.query("INSERT INTO page (url, title) VALUES ($1, $2)", [url, "test"]);
    }
    return false;
}

export const search = async (db: PGliteWorker, embedding: number[], matchThreshold = 0.8, limit = 5): Promise<SearchResult[]> => {
    const res = await db.query(`
        SELECT embedding.id, content, page_id, page.url as url, embedding.embedding <#> $1 AS prob, embedding.chunk_tag_id
        FROM embedding

        -- the inner product is negative, so we negate matchThreshold
        LEFT JOIN page
        ON page.id = embedding.page_id
        WHERE embedding.embedding <#> $1 < $2
        ORDER BY prob
        LIMIT $3
        `,
        [JSON.stringify(embedding), Number(matchThreshold), Number(limit)]
    );

    return res.rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        page_id: row.page_id,
        url: row.url,
        prob: row.prob,
        chunk_tag_id: row.chunk_tag_id
    }));
}

export const deletePagesOlderThan = async (db: PGliteWorker, numDays: number = 14) => {

    const res = await db.query(`
        DELETE FROM page
        WHERE page.createdAt < NOW() - INTERVAL '${numDays} days'
        RETURNING *;
    `)

    return res.affectedRows;
}

export const saveFilterSites = async (db: PGliteWorker, listOfSites: string[]) => {
    await db.transaction(async (tx) => {
        // not performant, but this will have to do for now.
        listOfSites.forEach(async (siteUrl) => {
            await tx.query('INSERT INTO filters(url) VALUES($1)', [siteUrl])
        });
    })
}
export const removeFilterSites = async (db: PGliteWorker, listOfSites: string[]) => {
    await db.transaction(async (tx) => {
        // not performant, but this will have to do for now.
        listOfSites.forEach(async (siteUrl) => {
            await tx.query('DELETE FROM filters WHERE url = $1', [siteUrl])
        });
    })
}

export const getFilterSites = async (db: PGliteWorker) => {
    const res = await db.query("SELECT url FROM filters");
    return res.rows.map((m) => m.url);
}

export const nukeDb = async (db: PGliteWorker) => {
    console.log("Nuking database. Bye bye.")
    const res = await db.query("DELETE FROM page")
    await db.exec(`DELETE FROM embedding;`)
    await db.exec(`DELETE FROM search_results_cache;`)
    await db.exec(`DELETE FROM db;`)
}

export const storeSearchCache = async (db: PGliteWorker, searchResultIds: number[], similarities: number[], searchText: string) => {
    if (searchResultIds.length > 0 && searchText.length > 0) {

        await db.transaction(async (tx) => {
            await tx.query("DELETE FROM search_results_cache;")

            for (let [_, sid, sim] of zip(searchResultIds, similarities)) {
                await tx.query(`INSERT INTO search_results_cache(embedding_id, search_text, similarity) VALUES ($1, $2, $3)`, [sid, searchText, sim])

            }
        });
    }
}

export const deleteStoreCache = async (db: PGliteWorker) => {
    await db.exec(`DELETE FROM search_results_cache;`)
}

export const getSearchResultsCache = async (db: PGliteWorker) => {
    const res = await db.query(`
        SELECT emb.id, emb.content, emb.page_id, page.url, src.similarity AS prob, emb.chunk_tag_id, src.search_text
        FROM search_results_cache AS src
        LEFT JOIN embedding emb ON emb.id = src.embedding_id
        LEFT JOIN page ON page.id = emb.page_id;
    `);
    return {
        cache: res.rows.map((row: any) => ({
            id: row.id,
            content: row.content,
            page_id: row.page_id,
            url: row.url,
            prob: row.prob,
            chunk_tag_id: row.chunk_tag_id
        })),
        searchText: res.rows.length > 0 ? res.rows[0].search_text : null
    }
}

export const saveModelType = async (db: PGliteWorker, modelType: string) => { }
