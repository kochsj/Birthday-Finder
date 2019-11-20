DROP TABLE IF EXISTS birthdays;

CREATE TABLE birthdays (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    birthday VARCHAR(255)
);


INSERT INTO birthdays (first_name, birthday)
VALUES ('stephen', '1990/09/24');

INSERT INTO birthdays (first_name, birthday)
VALUES ('charlie', '1995/03/10');