// import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js'

import { PGlite } from "@electric-sql/pglite";
import { vector } from '@electric-sql/pglite/vector';

const INDEXED_DB = "idb://casper"
let dbInstance;

export async function getDB() {
    if (dbInstance) {
        console.log("Pglite instance exists. Reusing the instance...")
        return dbInstance;
    }

    const metaDb = new PGlite(INDEXED_DB, {
        extensions: { vector }
    });

    console.log("DB schema created.")
    await metaDb.waitReady;
    dbInstance = metaDb;

    await initSchema(dbInstance);
    console.log(await query(dbInstance))

    return metaDb;
}

export const initSchema = async (db: PGlite) => {
    return await db.exec(`
        create extension if not exists vector;
        -- drop table if exists embeddings; -- Uncomment this line to reset the database
        create table if not exists embeddings (
            id bigint primary key generated always as identity,
            url text,
            content text not null,
            embedding vector (384),
            createdAt timestamp now()
        );
        
        create index on embeddings using hnsw (embedding vector_ip_ops);
    `)
}

const query = async (db: PGlite) => {
    const res = await db.query("select * from embeddings");
    return res.rows;
}

const search = async (db: PGlite, embedding: number[], matchThreshold = 0.8, limit = 3) => {
    const res = await db.query(`
        select * from embeddings

        -- the inner product is negative, so we negate matchThreshold
        where embeddings.embedding <#> $1 < $2

        order by embeddings.embedding <#> $1
        limit $3
        `,
        [JSON.stringify(embedding), Number(matchThreshold), Number(limit)]);

    return res.rows;
}