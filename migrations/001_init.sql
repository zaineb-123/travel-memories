-- Travel Memories : schéma initial

CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  username       VARCHAR(50)  NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  TEXT         NOT NULL,
  full_name      VARCHAR(100) NOT NULL,
  bio            TEXT,
  avatar_url     TEXT         NOT NULL DEFAULT '',
  country        VARCHAR(50),
  city           VARCHAR(50),
  theme          TEXT         NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark')),
  role           TEXT         NOT NULL DEFAULT 'user'  CHECK (role IN ('user','admin','moderator')),
  status         TEXT         NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','banned')),
  ban_reason     TEXT,
  email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_key ON users (lower(username));
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memories (
  id            SERIAL PRIMARY KEY,
  user_id       INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(100) NOT NULL,
  description   TEXT         NOT NULL,
  country       VARCHAR(50)  NOT NULL,
  city          VARCHAR(50),
  latitude      DOUBLE PRECISION CHECK (latitude  BETWEEN -90  AND 90),
  longitude     DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  location_name TEXT,
  travel_date   DATE         NOT NULL,
  cover_image   TEXT         NOT NULL DEFAULT '',
  views_count   INT          NOT NULL DEFAULT 0,
  visibility    TEXT         NOT NULL DEFAULT 'public'    CHECK (visibility IN ('public','private','followers')),
  status        TEXT         NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft','archived','reported','deleted')),
  is_featured   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX memories_user_idx ON memories (user_id);
CREATE INDEX memories_country_idx ON memories (lower(country));
CREATE INDEX memories_feed_idx ON memories (status, visibility, created_at DESC);

CREATE TABLE memory_photos (
  id         SERIAL PRIMARY KEY,
  memory_id  INT     NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  image_url  TEXT    NOT NULL,
  file_name  TEXT    NOT NULL,
  size_bytes INT     NOT NULL DEFAULT 0,
  caption    TEXT,
  sort_order INT     NOT NULL DEFAULT 0,
  is_cover   BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX memory_photos_memory_idx ON memory_photos (memory_id);

CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  slug VARCHAR(40) NOT NULL UNIQUE
);
CREATE TABLE memory_tags (
  memory_id INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  tag_id    INT NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (memory_id, tag_id)
);

CREATE TABLE likes (
  user_id    INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  memory_id  INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, memory_id)
);
CREATE INDEX likes_memory_idx ON likes (memory_id);

CREATE TABLE favorites (
  user_id    INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  memory_id  INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, memory_id)
);

CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  user_id    INT  NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  memory_id  INT  NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  parent_id  INT  REFERENCES comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_memory_idx ON comments (memory_id);

CREATE TABLE comment_likes (
  user_id    INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  comment_id INT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, comment_id)
);

CREATE TABLE follows (
  follower_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX follows_following_idx ON follows (following_id);

CREATE TABLE notifications (
  id           SERIAL PRIMARY KEY,
  user_id      INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_user_id INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('like','comment','follow')),
  reference_id INT  NOT NULL,
  message      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, is_read, created_at DESC);

CREATE TABLE reports (
  id          SERIAL PRIMARY KEY,
  reporter_id INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('memory','user','comment')),
  target_id   INT  NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  action      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reports_status_idx ON reports (status);

CREATE TABLE activity_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   INT  NOT NULL DEFAULT 0,
  ip_address  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_created_idx ON activity_logs (created_at DESC);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE contact_messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
