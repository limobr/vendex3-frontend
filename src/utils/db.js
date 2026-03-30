// src/utils/db.js
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('vendex.db');

export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS users_local (
        id INTEGER PRIMARY KEY NOT NULL,
        user_id INTEGER,
        username TEXT,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        user_type TEXT
      );`
    );
  });

  return db;
};

export default db;
