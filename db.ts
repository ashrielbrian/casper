
import { PGlite } from "~dist/electric-sql";
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'
import { vector } from '~dist/electric-sql/vector';
// import { worker } from '@electric-sql/pglite/worker'

// import { PGlite } from "electric-sql/dist/index.js"
// import { vector } from "electric-sql/dist/vector/index.js"

const INDEXED_DB = "idb://casper"
// let dbInstance;

// export async function getDB() {
//     if (dbInstance) {
//         console.log("Pglite instance exists. Reusing the instance...")
//         return dbInstance;
//     }

//     const metaDb = new PGlite(INDEXED_DB, {
//         extensions: { vector }
//     });

//     console.log("DB schema created.")
//     await metaDb.waitReady;
//     dbInstance = metaDb;

//     await initSchema(dbInstance);
//     console.log(await query(dbInstance))

//     return metaDb;
// }

// export const initSchema = async (db: PGlite) => {
//     return await db.exec(`
//         create extension if not exists vector;
//         -- drop table if exists embeddings; -- Uncomment this line to reset the database
//         create table if not exists embeddings (
//             id bigint primary key generated always as identity,
//             url text,
//             content text not null,
//             embedding vector (384),
//             createdAt timestamp now()
//         );

//         create index on embeddings using hnsw (embedding vector_ip_ops);
//     `)
// }
export interface SearchResult {
    id: number
    content: string,
    page_id: number,
    prob: number
}

export const search = async (db: PGliteWorker, embedding: number[], matchThreshold = 0.8, limit = 3): Promise<SearchResult[]> => {
    const res = await db.query(`
        select id, page_id, content, embedding.embedding <#> $1 as prob from embedding

        -- the inner product is negative, so we negate matchThreshold
        where embedding.embedding <#> $1 < $2

        order by embedding.embedding <#> $1
        limit $3
        `,
        [JSON.stringify(embedding), Number(matchThreshold), Number(limit)]);

    return res.rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        page_id: row.page_id,
        prob: row.prob
    }));
}