ALTER TABLE public.settings
ADD COLUMN birthday_sheet_url text NOT NULL DEFAULT '',
ADD COLUMN birthday_enabled boolean NOT NULL DEFAULT false;