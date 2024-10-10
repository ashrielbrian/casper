import { worker } from 'dist/electric-sql/worker/index.js'

import { getDB } from "~db";

worker({
    async init() {

        const pg = await getDB();
        return pg;
    },
});

console.log("Service worker has the PGlite worker started.")