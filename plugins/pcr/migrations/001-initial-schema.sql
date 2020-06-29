-- Up
CREATE TABLE damages (id INTEGER PRIMARY KEY, guild_id INTEGER, user_name TEXT, user_id INTEGER, boss_id INTEGER, round INTEGER, damage INTEGER, current_hp INTEGER, max_hp INTEGER, time INTEGER);

-- Down
DROP DROP TABLE IF EXISTS Guild;
