--
-- PostgreSQL database dump
--

\restrict Ayao3RHeCeSvMkkEwndGQjQtd0vQzMOF3aOGcmeFCLe4sPakoacOhlLacFTMtVg

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users (
    id integer NOT NULL,
    clerk_id text NOT NULL,
    email text NOT NULL,
    first_name text,
    last_name text,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_users_id_seq OWNED BY public.app_users.id;


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    project_id integer NOT NULL,
    entity_id integer,
    name text NOT NULL,
    asset_type text NOT NULL,
    description text,
    flavor_text text,
    image_data text,
    image_prompt text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- Name: change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_log (
    id integer NOT NULL,
    project_id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer,
    action text NOT NULL,
    description text NOT NULL,
    previous_value jsonb,
    new_value jsonb,
    author text DEFAULT 'Designer'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: change_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_log_id_seq OWNED BY public.change_log.id;


--
-- Name: collab_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_tasks (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    assignee text,
    category text,
    due_date text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collab_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collab_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collab_tasks_id_seq OWNED BY public.collab_tasks.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entities (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    description text,
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entities_id_seq OWNED BY public.entities.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    color text DEFAULT 'slate'::text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    topic text,
    look_at_later boolean DEFAULT false NOT NULL
);


--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    archetype text,
    description text,
    starting_resources jsonb DEFAULT '{}'::jsonb,
    victory_condition text,
    special_ability text,
    playstyle text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.players_id_seq OWNED BY public.players.id;


--
-- Name: playtest_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playtest_feedback (
    id integer NOT NULL,
    project_id integer NOT NULL,
    tester_name text,
    session_code text,
    overall_rating integer,
    fun_rating integer,
    balance_rating integer,
    clarity_rating integer,
    what_worked text,
    what_didnt text,
    suggestions text,
    would_play boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: playtest_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playtest_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playtest_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playtest_feedback_id_seq OWNED BY public.playtest_feedback.id;


--
-- Name: playtest_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playtest_sessions (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    date text,
    player_count integer,
    duration integer,
    rating integer,
    notes text,
    issues jsonb DEFAULT '[]'::jsonb,
    positives jsonb DEFAULT '[]'::jsonb,
    suggestions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: playtest_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playtest_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playtest_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playtest_sessions_id_seq OWNED BY public.playtest_sessions.id;


--
-- Name: project_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_chat_messages (
    id integer NOT NULL,
    project_id integer NOT NULL,
    user_id text,
    chat_type text DEFAULT 'design'::text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_chat_messages_id_seq OWNED BY public.project_chat_messages.id;


--
-- Name: project_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_files (
    id integer NOT NULL,
    project_id integer NOT NULL,
    filename text NOT NULL,
    file_type text NOT NULL,
    source_url text,
    extracted_text text,
    summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_files_id_seq OWNED BY public.project_files.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    genre text,
    player_count text,
    target_duration text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    for_client text
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id integer NOT NULL,
    entity_id integer NOT NULL,
    name text NOT NULL,
    data_type text NOT NULL,
    default_value text,
    min_value text,
    max_value text,
    unit text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: properties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;


--
-- Name: research_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_items (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    content text,
    source_url text,
    type text DEFAULT 'text'::text NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: research_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.research_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: research_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.research_items_id_seq OWNED BY public.research_items.id;


--
-- Name: rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rules (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rules_id_seq OWNED BY public.rules.id;


--
-- Name: sandbox_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sandbox_messages (
    id integer NOT NULL,
    project_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sandbox_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sandbox_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sandbox_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sandbox_messages_id_seq OWNED BY public.sandbox_messages.id;


--
-- Name: simulations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulations (
    id integer NOT NULL,
    project_id integer NOT NULL,
    label text,
    config jsonb NOT NULL,
    percentile_10 real NOT NULL,
    percentile_50 real NOT NULL,
    percentile_90 real NOT NULL,
    mean real NOT NULL,
    std_dev real NOT NULL,
    economy_health_score real NOT NULL,
    turn_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: simulations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.simulations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: simulations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.simulations_id_seq OWNED BY public.simulations.id;


--
-- Name: storyboard_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storyboard_nodes (
    id integer NOT NULL,
    project_id integer NOT NULL,
    parent_id integer,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'idea'::text NOT NULL,
    type text DEFAULT 'rule_variant'::text NOT NULL,
    linked_rule_title text,
    color text DEFAULT 'blue'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: storyboard_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.storyboard_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: storyboard_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.storyboard_nodes_id_seq OWNED BY public.storyboard_nodes.id;


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    id integer NOT NULL,
    user_id text NOT NULL,
    provider text DEFAULT 'anthropic'::text NOT NULL,
    model text DEFAULT 'claude-haiku-4-5'::text NOT NULL,
    anthropic_api_key text,
    openai_api_key text,
    gemini_api_key text,
    xai_api_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_settings_id_seq OWNED BY public.user_settings.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: app_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users ALTER COLUMN id SET DEFAULT nextval('public.app_users_id_seq'::regclass);


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- Name: change_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_log ALTER COLUMN id SET DEFAULT nextval('public.change_log_id_seq'::regclass);


--
-- Name: collab_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_tasks ALTER COLUMN id SET DEFAULT nextval('public.collab_tasks_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: entities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities ALTER COLUMN id SET DEFAULT nextval('public.entities_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);


--
-- Name: players id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players ALTER COLUMN id SET DEFAULT nextval('public.players_id_seq'::regclass);


--
-- Name: playtest_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playtest_feedback ALTER COLUMN id SET DEFAULT nextval('public.playtest_feedback_id_seq'::regclass);


--
-- Name: playtest_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playtest_sessions ALTER COLUMN id SET DEFAULT nextval('public.playtest_sessions_id_seq'::regclass);


--
-- Name: project_chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_chat_messages ALTER COLUMN id SET DEFAULT nextval('public.project_chat_messages_id_seq'::regclass);


--
-- Name: project_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files ALTER COLUMN id SET DEFAULT nextval('public.project_files_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: properties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);


--
-- Name: research_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_items ALTER COLUMN id SET DEFAULT nextval('public.research_items_id_seq'::regclass);


--
-- Name: rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules ALTER COLUMN id SET DEFAULT nextval('public.rules_id_seq'::regclass);


--
-- Name: sandbox_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sandbox_messages ALTER COLUMN id SET DEFAULT nextval('public.sandbox_messages_id_seq'::regclass);


--
-- Name: simulations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulations ALTER COLUMN id SET DEFAULT nextval('public.simulations_id_seq'::regclass);


--
-- Name: storyboard_nodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storyboard_nodes ALTER COLUMN id SET DEFAULT nextval('public.storyboard_nodes_id_seq'::regclass);


--
-- Name: user_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings ALTER COLUMN id SET DEFAULT nextval('public.user_settings_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	c529673ae52c1b789ec078d1003897f83a63db46d7b3f37d84a6b862bcd35ca5	1776957586716
2	ce54cbb0e4dfc4bf1c2d50b3700f8a21dd4ec61919cb03f35bab0ca3a3d463a1	1776962000000
3	0e859c6393538fe0d8e75c26ce52493e6e48626ed07e5090e288bf11a029b700	1776963000000
\.


--
-- Data for Name: app_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_users (id, clerk_id, email, first_name, last_name, role, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assets (id, project_id, entity_id, name, asset_type, description, flavor_text, image_data, image_prompt, created_at) FROM stdin;
2	1	\N	Dragon Sword	card	# Dragon Sword\n\n**Mechanical Description:**\nWhen played, deal 3 damage to any target and gain 2 Armor. If your Health is below 50%, this card costs 1 less to play.\n\n**Flavor Text:**\n*Forged in the heart of Mount Infernus, this blade drinks deep of draconic fire. Legends say it was wielded by the last hero who stood against the sky-tyrants.*				2026-04-22 23:27:59.657504+00
\.


--
-- Data for Name: change_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.change_log (id, project_id, entity_type, entity_id, action, description, previous_value, new_value, author, created_at) FROM stdin;
\.


--
-- Data for Name: collab_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.collab_tasks (id, project_id, title, description, status, priority, assignee, category, due_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, title, created_at) FROM stdin;
\.


--
-- Data for Name: entities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.entities (id, project_id, name, type, description, color, created_at, updated_at) FROM stdin;
1	1	Dragon	Item		\N	2026-04-22 20:04:49.14226+00	2026-04-22 20:04:49.14226+00
2	2	Warrior	Item		\N	2026-04-22 20:07:40.447702+00	2026-04-22 20:07:40.447702+00
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, conversation_id, role, content, created_at) FROM stdin;
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notes (id, project_id, title, content, color, pinned, created_at, updated_at, topic, look_at_later) FROM stdin;
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.players (id, project_id, name, archetype, description, starting_resources, victory_condition, special_ability, playstyle, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: playtest_feedback; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.playtest_feedback (id, project_id, tester_name, session_code, overall_rating, fun_rating, balance_rating, clarity_rating, what_worked, what_didnt, suggestions, would_play, created_at) FROM stdin;
\.


--
-- Data for Name: playtest_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.playtest_sessions (id, project_id, title, date, player_count, duration, rating, notes, issues, positives, suggestions, created_at) FROM stdin;
\.


--
-- Data for Name: project_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_chat_messages (id, project_id, user_id, chat_type, role, content, created_at) FROM stdin;
1	1	\N	design	user	Hello, what game am I designing?	2026-04-27 02:24:50.028884+00
2	1	\N	design	assistant	You're designing "Dragon Conquest," an epic fantasy strategy board game. If you need any assistance refining mechanics or exploring ideas, just let me know!	2026-04-27 02:24:50.028884+00
\.


--
-- Data for Name: project_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_files (id, project_id, filename, file_type, source_url, extracted_text, summary, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, name, description, genre, player_count, target_duration, created_at, updated_at, for_client) FROM stdin;
1	Dragon Conquest	An epic fantasy conquest board game	Fantasy Strategy	\N	\N	2026-04-22 20:04:37.496428+00	2026-04-22 20:04:37.496428+00	\N
2	Test Game ZZ9	\N	Strategy	\N	\N	2026-04-22 20:07:21.779326+00	2026-04-22 20:07:21.779326+00	\N
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.properties (id, entity_id, name, data_type, default_value, min_value, max_value, unit, description, created_at) FROM stdin;
\.


--
-- Data for Name: research_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.research_items (id, project_id, title, content, source_url, type, tags, created_at) FROM stdin;
1	1	en.wikipedia.org — fetched	Wikipedia, the free encyclopedia Jump to content Main menu Main menu move to sidebar hide Navigation Main page Contents Current events Random article About Wikipedia Contact us Contribute Help Learn to edit Community portal Recent changes Upload file Special pages Search Search Appearance Donate Create account Log in Personal tools Donate Create account Log in Main Page Main Page Talk English Read View source View history Tools Tools move to sidebar hide Actions Read View source View history General What links here Related changes Upload file Permanent link Page information Cite this page Get shortened URL Print/export Download as PDF Printable version In other projects Abstract Wikipedia Wikimedia Commons Wikimedia Foundation MediaWiki Meta-Wiki Wikimedia Outreach Multilingual Wikisource Wikispecies Wikibooks Wikidata Wikifunctions Wikimania Wikinews Wikiquote Wikisource Wikiversity Wikivoyage Wiktionary Wikidata item Appearance move to sidebar hide From Wikipedia, the free encyclopedia Welcome to Wikipedia , the free encyclopedia that anyone can edit . 276,294 active editors 7,171,922 articles in English From today's featured article Illustration of various forms of nihilism Nihilism is a family of philosophical views. Existential nihilism asserts that life is inherently meaningless and lacks a higher purpose, suggesting that all individual and societal achievements are ultimately pointless. Moral nihilism denies the objective existence of morality , arguing that moral evaluations and practices rest on misguided assumptions without any foundation in external reality . Epistemological forms of nihilism challenge objective knowledge and truth . Some versions argue that these phenomena are relative to the perspectives of individuals or cultural contexts, while others deny their existence altogether . Cosmological nihilism is the view that reality is unintelligible and indifferent to human understanding. Metaphysical nihilism holds that there is no fundamental reason for why something exists rather than nothing . Nihilism is also described as a broad cultural phenomenon or historical movement that pervades modernity in the Western world . ( Full&#160;article... ) Recently featured: " Sinestro Corps War " Sci-Fi Dine-In Theater Restaurant 1986 World Snooker Championship Archive By email More featured articles About Did you know&#160;... Altar with Palmyrene inscription ... that the first decipherment of a dead language in modern times was of Palmyrene inscriptions (first published example pictured) &#63; ... that a raja of Kolhapur was knighted at the age of 14? ... that a lunar eclipse is said to have fulfilled a prophecy resulting in the fall of Constantinople ? ... that a historian described the publisher T.&#160;S. Denison as synonymous with blackface minstrelsy? ... that director Peyton Reed likened the collaboration between the filmmakers of Phase Three of the Marvel Cinematic Universe to the studio system of Golden Age Hollywood? ... that several people returned to Judaism after discovering their Jewish ancestry through the Society for Crypto-Judaic Studies ? ... that Cathy Cassidy wrote Angel Cake after reading a girl's account of her first days in Britain? ... that the 1980s J-pop song " Aoi Sangoshou " appeared on music charts in Korea 44 years after its release? ... that the Coral Sea Islands were once proclaimed to be an independent nation known as the Gay and Lesbian Kingdom of the Coral Sea Islands ? Archive Start a new article Nominate an article In the news Rumen Radev The Progressive Bulgaria party, led by former president Rumen Radev (pictured) , wins a majority of the National Assembly in the parliamentary elections , in a bid to end the ongoing Bulgarian political crisis . Separate school shootings in Siverek and in Onikişubat , Turkey, leave 12 people dead and 35 others injured. Romuald Wadagni wins the Beninese presidential election . In golf, Rory McIlroy wins the Masters Tournament . Ongoing : Afghanistan–Pakistan war Iran war ( Lebanon war ) Russo-Ukrainian war timeline Sudanese civil war timeline Recent deaths &#58; Osvaldas Balakauskas Andy Kershaw Marian Cygan Phil Garner José Santamaría Justin Fairfax More current events Nominate an article On this day April 22 Two-cent piece 1073 – Gregory&#160;VII was elected pope following the death of Alexander&#160;II . 1864 – U.S. Congress passed the Coinage Act , which authorized the minting of the two-cent piece (pictured) , the first U.S. coin to bear the phrase " In God We Trust ". 1951 – Korean War : The Chinese People's Volunteer Army attacked positions occupied mainly by Australian and Canadian forces, starting the Battle of Kapyong . 2004 – Flammable cargo exploded at a railway station in Ryongchon , North Korea, killing at least 54 people and injuring more than a thousand others. 2020 – A truck struck and killed four Victoria Police officers on the Eastern Freeway , Australia, the force's deadliest single incident. Germaine de Staël ( b. &#160;1766) Emily Davies ( b. &#160;1830) Dan Cloutier ( b. &#160;1976) Adrian Garrett ( d. &#160;2021) More anniversaries: April 21 April 22 April 23 Archive By email List of days of the year About From today's featured list Sheila Dikshit As of 2026, more than 200 chief ministers of states in India have been members of the Indian National Congress (INC), one of the two major parties in the political system of the Republic of India . According to the Constitution of India , the governor is the de jure head at the state level, but de facto executive authority rests with the chief minister . In the parliamentary system of government, the chief minister is treated as the "first among equals" in the cabinet . Their term is normally limited to five years if they have the assembly's confidence. There are no limits to the number of terms the chief minister can serve. Five INC chief ministers have been women, including Sheila Dikshit (pictured) , who was Chief Minister of Delhi from 1998 to 2013. Dikshit is the longest-serving INC chief minister, as well as the longest-serving female chief minister of any party. As of March&#160;2026, the INC is in power in three states: Himachal Pradesh , Karnataka and Telangana . ( Full&#160;list... ) Recently featured: Awards and nominations received by Giorgio Moroder Alexander McQueen collections 20–20–20 club Archive More featured lists Today's featured picture J.&#160;Robert Oppenheimer (April&#160;22, 1904&#160;– February&#160;18, 1967) was an American theoretical physicist who served as the director of the Manhattan Project 's Los Alamos Laboratory during World War&#160;II. He is often called the "father of the atomic bomb " for his role in overseeing the development of the first nuclear weapons. During the Second Red Scare , Oppenheimer's stances, together with his past associations with the Communist Party USA , led to a security hearing before the United States Atomic Energy Commission and the revocation of his security clearance in 1954. He continued to lecture, write, and work on physics, and in 1963 received the Enrico Fermi Award for contributions to theoretical physics. This portrait photograph of Oppenheimer was taken around 1944, while he was the director of the Los Alamos Laboratory. The image is in the holdings of the National Archives and Records Administration . Photograph credit: unknown; restored by MyCatIsAChonk Recently featured: Elizabeth&#160;II Doris Fawn-breasted brilliant Archive More featured pictures Other areas of Wikipedia Community portal – The central hub for editors, with resources, links, tasks, and announcements. Village pump – Forum for discussions about Wikipedia itself, including policies and technical issues. Site news – Sources of news about Wikipedia and the broader Wikimedia movement. Teahouse – Ask basic questions about using or editing Wikipedia. Help desk – Ask questions about using or editing Wikipedia. Reference desk – Ask research questions about encyclopedic topics. Content portals – A unique way to navigate the encyclopedia. Wikipedia's sister projects Wikipedia is written by volunteer editors and hosted by the Wikimedia Foundation , a non-profit organization that also hosts a range of other volunteer projects : Commons Free media repository MediaWiki Wiki software development Meta-Wiki Wikimedia project coordination Wikibooks Free textbooks and manuals Wikidata Free knowledge base Wikifunctions Catalog of computer functions Wikiquote Collection of quotations Wikisource Free-content library Wikispecies Directory of species Wikiversity Free learning tools Wikivoyage Free travel guide Wiktionary Dictionary and thesaurus Wikipedia languages This Wikipedia is written in English . Many other Wikipedias are available ; some of the largest are listed below. 1,000,000+ articles العربية Deutsch Español فارسی &#8206; Français Italiano Nederlands 日本語 Polski Português Русский Svenska Українська Tiếng Việt 中文 250,000+ articles Bahasa Indonesia Bahasa Melayu Bân-lâm-gú Български Català Čeština Dansk Eesti Ελληνικά Esperanto Euskara עברית Հայերեն 한국어 Magyar Norsk bokmål Română Simple English Slovenčina Srpski Srpskohrvatski Suomi Türkçe Oʻzbekcha 50,000+ articles Asturianu Azərbaycanca বাংলা Bosanski کوردی Frysk Gaeilge Galego Hrvatski ქართული Kurdî Latviešu Lietuvių മലയാളം Македонски မြန်မာဘာသာ Norsk nynorsk ਪੰਜਾਬੀ Shqip Slovenščina ไทย తెలుగు اردو Retrieved from " https://en.wikipedia.org/w/index.php?title=Main_Page&amp;oldid=1345340283 " 346 languages Аԥсшәа Acèh Адыгабзэ Afrikaans Alemannisch Алтай тил አማርኛ Pangcah Aragonés Ænglisc Obolo अंगिका العربية ܐܪܡܝܐ الدارجة مصرى অসমীয়া Asturianu Atikamekw Авар Kotava अवधी Aymar aru Azərbaycanca تۆرکجه Башҡортса Basa Bali Boarisch Žemaitėška Batak Toba Bikol Central Bajau Sama Беларуская (тарашкевіца) Беларуская Betawi Български भोजपुरी Bislama Banjar ပအိုဝ်ႏဘာႏသာႏ Bamanankan বাংলা བོད་ཡིག বিষ্ণুপ্রিয়া মণিপুরী Brezhoneg Bosanski Batak Mandailing Basa Ugi Буряад Català Chavacano de Zamboanga 閩東語 / Mìng-dĕ̤ng-ngṳ̄ Нохчийн Cebuano Chamoru ᏣᎳᎩ Tsetsêhestâhese کوردی Corsu Nēhiyawēwin / ᓀᐦᐃᔭᐍᐏᐣ Qırımtatarca Čeština Kaszëbsczi Словѣньскъ / ⰔⰎⰑⰂⰡⰐⰠⰔⰍⰟ Чӑвашла Cymraeg Dansk Dagbanli Deutsch Dagaare Thuɔŋjäŋ Zazaki Dolnoserbski Kadazandusun डोटेली ދިވެހިބަސް ཇོང་ཁ Eʋegbe Ελληνικά Emiliàn e rumagnòl Esperanto Español Eesti Euskara Estremeñu فارسی Mfantse Fulfulde Suomi Võro Na Vosa Vakaviti Føroyskt Fɔ̀ngbè Français Arpetan Nordfriisk Furlan Frysk Gaeilge Gagauz 贛語 Kriyòl gwiyannen Gàidhlig Galego گیلکی Avañe&#039;ẽ गोंयची कोंकणी / Gõychi Konknni Bahasa Hulontalo 𐌲𐌿𐍄𐌹𐍃𐌺 Ghanaian Pidgin ગુજરાતી Wayuunaiki Farefare Gungbe Gaelg Hausa 客家語 / Hak-kâ-ngî Hawaiʻi עברית हिन्दी Fiji Hindi Hrvatski Hornjoserbsce Kreyòl ayisyen Magyar Հայերեն Արեւմտահայերէն Interlingua Jaku Iban Bahasa Indonesia Interlingue Igbo Igala Iñupiatun Ilokano ГӀалгӀай Ido Íslenska Italiano ᐃᓄᒃᑎᑐᑦ / inuktitut 日本語 Patois La .lojban. Jawa ქართული Qaraqalpaqsha Taqbaylit Karai-karai Jju Адыгэбзэ Kabɩyɛ Tyap Kongo Kumoring Gĩkũyũ Қазақша Kalaallisut ភាសាខ្មែរ ಕನ್ನಡ Yerwa Kanuri 한국어 Перем коми Къарачай-малкъар کٲشُر Ripoarisch Kurdî Kʋsaal Коми Kernowek Кыргызча Latina Ladino Lëtzebuergesch Лакку Лезги Lingua Franca Nova Luganda Limburgs Ligure Ladin Lombard Lingála ລາວ Lietuvių Latgaļu Latviešu Madhurâ मैथिली Basa Banyumasan Мокшень Malagasy Олык марий Māori Minangkabau Македонски മലയാളം Монгол ꯃꯤꯇꯩ ꯂꯣꯟ ဘာသာမန် Moore मराठी Кырык мары Bahasa Melayu Malti Mirandés မြန်မာဘာသာ Эрзянь مازِرونی Nāhuatl Napulitano Nedersaksies Plattdüütsch नेपाली नेपाल भाषा Li Niha Nederlands Norsk nynorsk Norsk bokmål Novial ߒߞߏ IsiNdebele seSewula Nouormand Sesotho sa Leboa Nupe Diné bizaad Chi-Chewa Occitan Livvinkarjala Oromoo ଓଡ଼ିଆ Ирон ਪੰਜਾਬੀ Pangasinan Kapampangan Papiamentu Picard Naijá Deitsch Pälzisch पालि Polski Piemontèis پنجابی Ποντιακά Nawat پښتو Português Pinayuanan Runa Simi ရခိုင် Rumantsch Romani čhib Ikirundi Română Armãneashti Tarandíne Руски Русский Русиньскый Ikinyarwanda संस्कृतम् Саха тыла ᱥᱟᱱᱛᱟᱲᱤ Sardu Sicilianu Scots سنڌي Davvisámegiella Sängö Srpskohrvatski / српскохрватски Taclḥit တႆး සිංහල Simple English Slovenčina سرائیکی Slovenščina Gagana Samoa Anarâškielâ ChiShona Soomaaliga Shqip Српски / srpski Sranantongo SiSwati Sesotho Seeltersk Sunda Svenska Kiswahili ꠍꠤꠟꠐꠤ Ślůnski Sakizaya தமிழ் Tayal ತುಳು ᥖᥭᥰ ᥖᥬᥲ ᥑᥨᥒᥰ తెలుగు Tetun Тоҷикӣ ไทย ትግርኛ ትግሬ Türkmençe Tagalog Tolışi Setswana Lea faka-Tonga Toki pona Tok Pisin Türkçe Seediq Xitsonga Татарча / tatarça ChiTumbuka Twi Reo tahiti Тыва дыл Удмурт ئۇيغۇرچە / Uyghurche Українська اردو Oʻzbekcha / ўзбекча Tshivenda Vèneto Vepsän kel’ Tiếng Việt West-Vlams Volapük Walon Winaray Wolof 吴语 Хальмг IsiXhosa მარგალური ייִדיש Yorùbá Vahcuengh Zeêuws ⵜⴰⵎⴰⵣⵉⵖⵜ ⵜⴰⵏⴰⵡⴰⵢⵜ 文言 閩南語 / Bân-lâm-gí 粵語 中文 IsiZulu Edit links This page was last edited on 25 March 2026, at 16:10 &#160;(UTC) . Text is available under the Creative Commons Attribution-ShareAlike 4.0 License ;\nadditional terms may apply. By using this site, you agree to the Terms of Use and Privacy Policy . Wikipedia® is a registered trademark of the Wikimedia Foundation, Inc. , a non-profit organization. Privacy policy About Wikipedia Disclaimers Contact Wikipedia Legal &amp; safety contacts Code of Conduct Developers Statistics Cookie statement Mobile view Search Search Main Page 346 languages Add topic	https://en.wikipedia.org	url	[]	2026-04-22 22:17:26.866864+00
2	1	Test Mechanic Note	Worker placement with resource management	\N	text	[]	2026-04-22 22:17:47.522128+00
3	1	D&D Core Mechanics Reference	# Dungeons & Dragons - Core Mechanics\n\n## Dice System\n- **d20 System**: Primary mechanic using 20-sided die + modifiers vs target number (Difficulty Class/DC or Armor Class/AC)\n- **Advantage/Disadvantage**: Roll 2d20, take highest/lowest\n- **Other Dice**: d4, d6, d8, d10, d12, d100 for damage, effects, and random tables\n\n## Character Fundamentals\n\n### Six Ability Scores (3-20 range, 10 = average)\n- **Strength (STR)**: Physical power, melee attacks\n- **Dexterity (DEX)**: Agility, ranged attacks, AC\n- **Constitution (CON)**: Endurance, hit points\n- **Intelligence (INT)**: Reasoning, magic (Wizards)\n- **Wisdom (WIS)**: Awareness, magic (Clerics/Druids)\n- **Charisma (CHA)**: Force of personality, magic (Sorcerers/Bards)\n\n### Core Classes (5e)\n- **Barbarian**: Rage-fueled warriors\n- **Bard**: Magical performers and support\n- **Cleric**: Divine spellcasters and healers\n- **Druid**: Nature magic and shapeshifting\n- **Fighter**: Versatile weapon masters\n- **Monk**: Martial artists with ki powers\n- **Paladin**: Holy warriors with divine magic\n- **Ranger**: Wilderness experts and hunters\n- **Rogue**: Stealth, skill experts, sneak attack\n- **Sorcerer**: Innate magic users\n- **Warlock**: Pact-based magic from patrons\n- **Wizard**: Studied arcane spellcasters\n\n## Combat Mechanics\n\n### Turn Structure\n- **Initiative**: Dexterity check determines turn order\n- **Action Economy**: Each turn includes:\n  - 1 Action (Attack, Cast Spell, Dash, etc.)\n  - 1 Bonus Action (if ability grants it)\n  - 1 Reaction (opportunity attacks, counterspells)\n  - Movement (typically 30 feet)\n  - Free object interaction\n\n### Attack Resolution\n1. Roll d20 + attack bonus\n2. Compare to target's Armor Class (AC)\n3. If hit, roll damage dice + modifiers\n4. Target reduces Hit Points\n\n### Key Combat Concepts\n- **Hit Points (HP)**: Health pool, 0 HP = unconscious/dying\n- **Armor Class (AC)**: Defense rating (10 + armor + DEX modifier)\n- **Critical Hits**: Natural 20 = double damage dice\n- **Critical Fails**: Natural 1 = automatic miss\n- **Saving Throws**: Defensive rolls vs spell/effect DC\n- **Death Saves**: Three successes or failures determine if character stabilizes or dies\n\n## Magic System\n\n### Spell Slots\n- Limited daily resource for casting spells\n- Spell levels 1-9 (separate from character level)\n- Higher spell slots can cast lower-level spells\n- Recovered on long rest (8 hours)\n\n### Spell Schools\n- Abjuration (protection)\n- Conjuration (summoning)\n- Divination (information)\n- Enchantment (mind control)\n- Evocation (energy/damage)\n- Illusion (deception)\n- Necromancy (death/undeath)\n- Transmutation (transformation)\n\n### Concentration\n- Many spells require concentration (only one at a time)\n- Broken by damage (CON save) or casting another concentration spell\n\n## Progression System\n\n### Experience & Leveling (Levels 1-20)\n- Gain XP from combat, quests, roleplay\n- Level up grants: HP increase, new abilities, spell slots, proficiency bonus increase\n- **Proficiency Bonus**: +2 to +6 (scales with level), added to trained skills/attacks\n\n### Milestone Progression\n- Alternative: DM grants levels at story points (no XP tracking)\n\n## Dragon Types (Relevant to Dragon Conquest)\n\n### Chromatic Dragons (Evil)\n- **Red**: Fire breath, mountain lairs, greed\n- **Blue**: Lightning breath, desert lairs, vanity\n- **Green**: Poison breath, forest lairs, deception\n- **Black**: Acid breath, swamp lairs, cruelty\n- **White**: Cold breath, arctic lairs, savage\n\n### Metallic Dragons (Good)\n- **Gold**: Fire breath, wisdom, justice\n- **Silver**: Cold breath, kindness, aid to good\n- **Bronze**: Lightning breath, coastal, war against evil\n- **Copper**: Acid breath, hills, pranks and riddles\n- **Brass**: Fire breath, deserts, talkative\n\n### Dragon Abilities\n- **Breath Weapon**: Recharge on 5-6 (d6 roll)\n- **Frightful Presence**: Fear aura\n- **Legendary Actions**: Act outside their turn\n- **Legendary Resistance**: Auto-succeed saves (3/day)\n- **Lair Actions**: Environmental control in home territory\n\n## Relevant Mechanics for Board Game Adaptation\n\n1. **Action Economy**: Limited actions per turn creates strategic choices\n2. **Resource Management**: Spell slots, HP, abilities with limited uses\n3. **Advantage System**: Simple mechanic for situational bonuses\n4. **Leveling Thresholds**: Clear progression markers\n5. **Saving Throws**: Defensive player agency vs passive defense\n6. **Death Spiral Mitigation**: Many abilities recharge, preventing runaway advantage\n7. **Asymmetric Powers**: Each class plays fundamentally differently\n8. **Legendary Actions**: Boss-level enemies act more frequently\n\n## Design Philosophy\n- **Bounded Accuracy**: Numbers stay relatively small (AC 10-20, bonuses +0 to +11)\n- **Player Agency**: Roll your own dice for both offense and defense\n- **Teamwork Emphasis**: Classes complement each other\n- **Natural Language**: Rules written conversationally, specific beats general	\N	ai_note	[]	2026-04-22 22:18:37.500527+00
4	1	boardgamegeek.com — 4/22/2026	Just a moment... Enable JavaScript and cookies to continue	https://boardgamegeek.com/boardgame/174430/gloomhaven	url	[]	2026-04-22 22:23:43.194871+00
\.


--
-- Data for Name: rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rules (id, project_id, title, content, category, priority, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sandbox_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sandbox_messages (id, project_id, role, content, created_at) FROM stdin;
1	1	user	What rules should this game have?	2026-04-27 02:24:50.354027+00
2	1	assistant	To create a compelling game centered around the "Dragon" entity, we can incorporate various mechanics that enhance gameplay, encourage strategic decisions, and provide meaningful player interactions. Here are some suggested rules:\n\n### Game Objective\n- Players aim to collect a certain number of "Dragon" items or points associated with dragons through various means, such as quests, battles, or trade.\n\n### Dragon Acquisition\n1. **Exploration Phase**: Players can explore different regions on the board to uncover dragons. Each region can have its own difficulty level and reward structure.\n2. **Quest Cards**: Introduce quest cards that players can draw which require them to complete specific tasks to earn dragons. For example, "Slay a dragon in the Mountain region" or "Trade with a village to gain knowledge of a dragon."\n\n### Dragon Attributes\nThough the "Dragon" entity currently has no properties, consider introducing attributes to create depth:\n- **Element Type**: Fire, Water, Earth, Air. Each type could have strengths and weaknesses against others, influencing battles or trading.\n- **Rarity**: Different dragons could range from common to legendary, with rarer dragons providing more points or special abilities.\n  \n### Special Abilities\n- Players who acquire dragons may unlock special abilities (e.g., a fire dragon allows a player to reroll dice, a water dragon lets players skip over regions without penalty, etc.)\n\n### Combat Mechanic\n- Introduce a battle system where players can challenge each other or NPCs to capture dragons. Use dice rolls to determine outcomes, modified by the dragon's attributes.\n\n### Economy Design\n1. **Trading System**: Players can trade dragons or dragon-related resources with one another, creating a dynamic economy. Introduce a marketplace mechanic where players can buy/sell dragons or items.\n2. **Resource Generation**: Capturing dragons could allow players to harvest resources (e.g., Gold, Gems, or Magic Points) that can be used for various gameplay aspects.\n\n### Victory Conditions\n- Victory can be achieved through various methods, such as:\n  - Collecting a set number of dragons\n  - Amassing the highest points from dragons and resources\n  - Completing a specific powerful dragon quest that stands alone.\n\n### Potential Conflicts & Balance\n- Ensure that no single type of dragon (if attributes are introduced) becomes overwhelmingly advantageous. Balance playtesting will be crucial to maintain fairness.\n- Monitor the trading system to prevent market monopolies or elite player advantages.\n\n### Conclusion\nThese rules and mechanics will create a rich and engaging experience around the concept of "dragons" while promoting strategic depth and player interaction. Consider playtesting various combinations of the proposed features to ensure they synergize well and provide a balanced and enjoyable game.	2026-04-27 02:24:54.984804+00
\.


--
-- Data for Name: simulations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulations (id, project_id, label, config, percentile_10, percentile_50, percentile_90, mean, std_dev, economy_health_score, turn_data, created_at) FROM stdin;
\.


--
-- Data for Name: storyboard_nodes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.storyboard_nodes (id, project_id, parent_id, title, content, status, type, linked_rule_title, color, "position", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_settings (id, user_id, provider, model, anthropic_api_key, openai_api_key, gemini_api_key, xai_api_key, created_at, updated_at) FROM stdin;
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 3, true);


--
-- Name: app_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.app_users_id_seq', 1, false);


--
-- Name: assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assets_id_seq', 2, true);


--
-- Name: change_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.change_log_id_seq', 1, false);


--
-- Name: collab_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.collab_tasks_id_seq', 1, false);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversations_id_seq', 1, false);


--
-- Name: entities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.entities_id_seq', 2, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notes_id_seq', 1, false);


--
-- Name: players_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.players_id_seq', 1, false);


--
-- Name: playtest_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.playtest_feedback_id_seq', 1, false);


--
-- Name: playtest_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.playtest_sessions_id_seq', 1, false);


--
-- Name: project_chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_chat_messages_id_seq', 2, true);


--
-- Name: project_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_files_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 2, true);


--
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.properties_id_seq', 1, false);


--
-- Name: research_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.research_items_id_seq', 4, true);


--
-- Name: rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rules_id_seq', 1, false);


--
-- Name: sandbox_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sandbox_messages_id_seq', 2, true);


--
-- Name: simulations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.simulations_id_seq', 1, false);


--
-- Name: storyboard_nodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.storyboard_nodes_id_seq', 1, false);


--
-- Name: user_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_settings_id_seq', 1, false);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_clerk_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_clerk_id_unique UNIQUE (clerk_id);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: change_log change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_log
    ADD CONSTRAINT change_log_pkey PRIMARY KEY (id);


--
-- Name: collab_tasks collab_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_tasks
    ADD CONSTRAINT collab_tasks_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: playtest_feedback playtest_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playtest_feedback
    ADD CONSTRAINT playtest_feedback_pkey PRIMARY KEY (id);


--
-- Name: playtest_sessions playtest_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playtest_sessions
    ADD CONSTRAINT playtest_sessions_pkey PRIMARY KEY (id);


--
-- Name: project_chat_messages project_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_chat_messages
    ADD CONSTRAINT project_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: project_files project_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: research_items research_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_items
    ADD CONSTRAINT research_items_pkey PRIMARY KEY (id);


--
-- Name: rules rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_pkey PRIMARY KEY (id);


--
-- Name: sandbox_messages sandbox_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sandbox_messages
    ADD CONSTRAINT sandbox_messages_pkey PRIMARY KEY (id);


--
-- Name: simulations simulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulations
    ADD CONSTRAINT simulations_pkey PRIMARY KEY (id);


--
-- Name: storyboard_nodes storyboard_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storyboard_nodes
    ADD CONSTRAINT storyboard_nodes_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);


--
-- Name: assets assets_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: change_log change_log_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_log
    ADD CONSTRAINT change_log_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: collab_tasks collab_tasks_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_tasks
    ADD CONSTRAINT collab_tasks_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: entities entities_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: notes notes_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: players players_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: playtest_feedback playtest_feedback_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playtest_feedback
    ADD CONSTRAINT playtest_feedback_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: playtest_sessions playtest_sessions_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playtest_sessions
    ADD CONSTRAINT playtest_sessions_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_chat_messages project_chat_messages_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_chat_messages
    ADD CONSTRAINT project_chat_messages_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_files project_files_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: properties properties_entity_id_entities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_entity_id_entities_id_fk FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: research_items research_items_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_items
    ADD CONSTRAINT research_items_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: rules rules_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: sandbox_messages sandbox_messages_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sandbox_messages
    ADD CONSTRAINT sandbox_messages_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: simulations simulations_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulations
    ADD CONSTRAINT simulations_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: storyboard_nodes storyboard_nodes_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storyboard_nodes
    ADD CONSTRAINT storyboard_nodes_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Ayao3RHeCeSvMkkEwndGQjQtd0vQzMOF3aOGcmeFCLe4sPakoacOhlLacFTMtVg

