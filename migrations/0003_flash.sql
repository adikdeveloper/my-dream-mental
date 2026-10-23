-- Flash-anzan (chaqnash) rejimi: sonlar birma-bir ko'rinib o'chadi, oxirida bitta javob kiritiladi.
ALTER TABLE tests ADD COLUMN mode TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE tests ADD COLUMN flash_numbers INTEGER NOT NULL DEFAULT 5;
ALTER TABLE tests ADD COLUMN flash_interval_ms INTEGER NOT NULL DEFAULT 1000;
