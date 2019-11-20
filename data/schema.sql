DROP TABLE IF EXISTS birthdays;

CREATE TABLE birthdays (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    birthday VARCHAR(255),
    link VARCHAR(255)
);

-- INSERT INTO birthdays (first_name, birthday, link)
-- VALUES('Stephen', '09/24', 'sample link');