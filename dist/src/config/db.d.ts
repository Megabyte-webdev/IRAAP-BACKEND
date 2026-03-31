import { Pool } from "pg";
import * as schema from "../database/schema.js";
export declare function testDbConnection(): Promise<void>;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
//# sourceMappingURL=db.d.ts.map