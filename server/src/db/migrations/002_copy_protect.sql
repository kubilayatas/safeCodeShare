-- EK: Kopyalama koruması
ALTER TABLE pads ADD COLUMN copy_protect INTEGER NOT NULL DEFAULT 1;
ALTER TABLE courses ADD COLUMN default_copy_protect INTEGER NOT NULL DEFAULT 1;