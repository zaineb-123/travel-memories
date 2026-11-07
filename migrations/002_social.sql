-- Fonctions sociales : comptes privés, demandes d'abonnement, blocage,
-- messagerie privée, stories de voyage, mentions.

/* ---------------------------- Comptes privés ---------------------------- */
ALTER TABLE users ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- Un abonnement à un compte privé attend l'acceptation du propriétaire.
-- Tant que la demande est en attente, elle n'ouvre AUCUN droit (la table follows reste la seule source de vérité).
CREATE TABLE follow_requests (
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (requester_id, target_id),
  CHECK (requester_id <> target_id)
);
CREATE INDEX follow_requests_target_idx ON follow_requests (target_id, created_at DESC);

/* -------------------------------- Blocage ------------------------------- */
CREATE TABLE blocks (
  blocker_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX blocks_blocked_idx ON blocks (blocked_id);

/* ------------------------------- Messagerie ------------------------------ */
-- Une conversation à deux. user_a < user_b garantit une seule conversation par paire.
CREATE TABLE conversations (
  id              SERIAL PRIMARY KEY,
  user_a          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
CREATE INDEX conversations_a_idx ON conversations (user_a, last_message_at DESC);
CREATE INDEX conversations_b_idx ON conversations (user_b, last_message_at DESC);

CREATE TABLE messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT CHECK (body IS NULL OR char_length(body) BETWEEN 1 AND 2000),
  memory_id       INT REFERENCES memories(id) ON DELETE SET NULL,
  shared_memory   BOOLEAN NOT NULL DEFAULT FALSE,   -- reste vrai si le souvenir est supprimé plus tard
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  CHECK (body IS NOT NULL OR shared_memory)
);
CREATE INDEX messages_conv_idx ON messages (conversation_id, id DESC);
CREATE INDEX messages_unread_idx ON messages (conversation_id, sender_id) WHERE read_at IS NULL AND deleted_at IS NULL;

/* --------------------------------- Stories ------------------------------- */
CREATE TABLE stories (
  id            SERIAL PRIMARY KEY,
  user_id       INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  caption       VARCHAR(200),
  country       VARCHAR(50),
  location_name VARCHAR(200),
  latitude      DOUBLE PRECISION CHECK (latitude  BETWEEN -90  AND 90),
  longitude     DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  visibility    TEXT NOT NULL DEFAULT 'followers' CHECK (visibility IN ('public','followers')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);
CREATE INDEX stories_user_idx ON stories (user_id, created_at DESC);
CREATE INDEX stories_expires_idx ON stories (expires_at);

CREATE TABLE story_views (
  story_id  INT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

/* -------------------------------- Mentions ------------------------------- */
-- comment_id = 0 : mention dans le texte du souvenir lui-même.
CREATE TABLE mentions (
  memory_id    INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  comment_id   INT NOT NULL DEFAULT 0,
  mentioned_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (memory_id, comment_id, mentioned_id)
);
CREATE INDEX mentions_user_idx ON mentions (mentioned_id, created_at DESC);

/* ------------------------------ Notifications ---------------------------- */
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like','comment','follow','follow_request','follow_accepted','message','mention'));
