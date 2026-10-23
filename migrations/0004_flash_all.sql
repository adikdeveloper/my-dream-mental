-- Hamma testlar mental (chaqnash) rejimda: raqamlar ketma-ket chaqadi.
-- test_questions ga ketma-ketlikni saqlash ustuni (resume uchun).
ALTER TABLE test_questions ADD COLUMN flash_numbers_json TEXT;
UPDATE tests SET mode = 'flash' WHERE mode IS NULL OR mode != 'flash';
UPDATE tests SET flash_numbers = 5 WHERE flash_numbers IS NULL OR flash_numbers < 2;
UPDATE tests SET question_count = 10 WHERE question_count IS NULL OR question_count < 3;
