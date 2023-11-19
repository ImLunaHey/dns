import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

const db = connect(config);
const execute =
  process.env.ENV === 'production'
    ? db.execute
    : async (query: string, params: any[]) => {
        console.log('Executing query: %s', query);
        return db['execute'](query, params);
      };

export const database = {
  ...db,
  execute,
};
