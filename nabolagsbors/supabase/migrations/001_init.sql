-- Nabolagsbørs database schema

-- Borettslag (housing cooperatives)
create table borettslag (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  moderator_password_hash text,        -- bcrypt hash for styret access
  created_at  timestamptz not null default now()
);

-- Post types
create type post_type as enum ('gir', 'trenger', 'tilbyr', 'info');

-- Posts
create table posts (
  id              uuid primary key default gen_random_uuid(),
  borettslag_id   uuid not null references borettslag(id) on delete cascade,
  type            post_type not null,
  title           text not null,
  description     text,
  poster_name     text not null,
  apartment_nr    text not null,
  is_active       boolean not null default true,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- Replies on posts
create table replies (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references posts(id) on delete cascade,
  poster_name  text not null,
  apartment_nr text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);

-- Indexes
create index posts_borettslag_id_idx on posts(borettslag_id);
create index posts_created_at_idx on posts(created_at desc);
create index replies_post_id_idx on replies(post_id);

-- Row Level Security
alter table borettslag enable row level security;
alter table posts enable row level security;
alter table replies enable row level security;

-- Anyone can read borettslag
create policy "Public read borettslag"
  on borettslag for select using (true);

-- Anyone can read active posts
create policy "Public read active posts"
  on posts for select using (is_active = true);

-- Anyone can insert posts (no auth required)
create policy "Anyone can post"
  on posts for insert with check (true);

-- Anyone can read replies (post cascade handles visibility)
create policy "Public read replies"
  on replies for select using (true);

-- Anyone can reply
create policy "Anyone can reply"
  on replies for insert with check (true);

-- Only service role can update/delete posts and replies
-- Moderation done via Next.js API route with server-side check
