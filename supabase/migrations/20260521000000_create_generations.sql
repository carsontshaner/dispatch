create table generations (
  id                uuid          primary key default gen_random_uuid(),
  created_at        timestamptz   default now(),
  user_id           uuid          null,
  session_id        text          null,
  intake_json       jsonb         not null,
  tone              text,
  length_option     text,
  intake_version    text          not null,
  prompt_version    text          not null,
  model             text          not null,
  draft_text        text          not null,
  regeneration_count int          default 0,
  draft_tokens_in   int,
  draft_tokens_out  int,
  draft_latency_ms  int,
  final_text        text,
  was_edited        boolean       default false,
  edit_distance     int,
  edit_ratio        numeric,
  copied_at         timestamptz,
  edit_analysis     jsonb,
  analysis_status   text          default 'pending',
  meta              jsonb         default '{}'
);

create index generations_created_at_idx      on generations (created_at desc);
create index generations_prompt_version_idx  on generations (prompt_version);
create index generations_tone_idx            on generations (tone);
create index generations_analysis_status_idx on generations (analysis_status);

alter table generations enable row level security;
