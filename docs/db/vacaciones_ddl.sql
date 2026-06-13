-- =============================================================
-- MÓDULO DE SOLICITUDES DE VACACIONES
-- Convenciones: snake_case, enums tipados, FKs con ON UPDATE/DELETE explícito
-- =============================================================


-- -------------------------------------------------------------
-- 1. ENUMS NUEVOS
-- -------------------------------------------------------------

-- Roles del sistema (separado de la tabla profesor para no mezclar concerns)
CREATE TYPE public.vac_rol_enum AS ENUM (
    'Profesor',
    'Jefe de Departamento',
    'Jefe Administrativo',
    'Director de Escuela'
);

-- Estados posibles de una solicitud
CREATE TYPE public.vac_estado_enum AS ENUM (
    'Borrador',
    'Enviado',
    'Aprobado',
    'Rechazado'
);

-- Acción que toma un revisor en cada paso
CREATE TYPE public.vac_accion_enum AS ENUM (
    'Aprobado',
    'Rechazado'
);


-- -------------------------------------------------------------
-- 2. TABLA: usuario
--    Vincula a un profesor con credenciales y rol en el sistema.
--    Un profesor puede tener más de un rol (ej: es profesor y además
--    jefe de departamento), por eso el rol va en tabla aparte.
-- -------------------------------------------------------------

CREATE TABLE public.usuario (
    id              integer NOT NULL,
    id_profesor     integer NOT NULL,
    username        character varying(50) NOT NULL,
    password_hash   character varying(255) NOT NULL,
    activo          boolean DEFAULT true NOT NULL
);

CREATE SEQUENCE public.usuario_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.usuario_id_seq OWNED BY public.usuario.id;
ALTER TABLE ONLY public.usuario ALTER COLUMN id SET DEFAULT nextval('public.usuario_id_seq'::regclass);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_profesor_unique UNIQUE (id_profesor);
ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_username_unique UNIQUE (username);
ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_profesor_fkey
        FOREIGN KEY (id_profesor) REFERENCES public.profesor(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;


-- -------------------------------------------------------------
-- 3. TABLA: usuario_rol
--    Permite que un usuario tenga uno o más roles.
-- -------------------------------------------------------------

CREATE TABLE public.usuario_rol (
    id_usuario  integer NOT NULL,
    rol         public.vac_rol_enum NOT NULL
);

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_pkey PRIMARY KEY (id_usuario, rol);
ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_id_usuario_fkey
        FOREIGN KEY (id_usuario) REFERENCES public.usuario(id)
        ON UPDATE CASCADE ON DELETE CASCADE;


-- -------------------------------------------------------------
-- 4. TABLA: vac_solicitud
--    Una solicitud de vacaciones hecha por un profesor.
--    El campo "paso_actual" indica en qué eslabón de la cadena
--    de aprobación se encuentra (1=Jefe Depto, 2=Jefe Admin, 3=Director).
--    Si estado='Borrador' el paso_actual es NULL (aún no enviada).
-- -------------------------------------------------------------

CREATE TABLE public.vac_solicitud (
    id                  integer NOT NULL,
    id_usuario          integer NOT NULL,           -- profesor que solicita
    fecha_inicio        date NOT NULL,
    fecha_fin           date NOT NULL,
    dias_habiles        smallint NOT NULL,
    observacion         character varying(300),     -- nota opcional del profesor
    estado              public.vac_estado_enum DEFAULT 'Borrador'::public.vac_estado_enum NOT NULL,
    paso_actual         smallint,                   -- 1, 2 o 3 según el eslabón pendiente
    fecha_creacion      timestamp DEFAULT now() NOT NULL,
    fecha_modificacion  timestamp DEFAULT now() NOT NULL,
    CONSTRAINT vac_solicitud_fechas_check CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT vac_solicitud_dias_check   CHECK (dias_habiles > 0)
);

CREATE SEQUENCE public.vac_solicitud_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.vac_solicitud_id_seq OWNED BY public.vac_solicitud.id;
ALTER TABLE ONLY public.vac_solicitud ALTER COLUMN id SET DEFAULT nextval('public.vac_solicitud_id_seq'::regclass);

ALTER TABLE ONLY public.vac_solicitud
    ADD CONSTRAINT vac_solicitud_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vac_solicitud
    ADD CONSTRAINT vac_solicitud_id_usuario_fkey
        FOREIGN KEY (id_usuario) REFERENCES public.usuario(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;


-- -------------------------------------------------------------
-- 5. TABLA: vac_revision
--    Historial de cada acción tomada sobre una solicitud.
--    Cada fila = un revisor que aprobó o rechazó en su eslabón.
--    Si fue rechazada y el profesor corrige y reenvía, se genera
--    una nueva fila cuando el mismo eslabón vuelve a revisar.
-- -------------------------------------------------------------

CREATE TABLE public.vac_revision (
    id              integer NOT NULL,
    id_solicitud    integer NOT NULL,
    id_usuario      integer NOT NULL,               -- revisor que actuó
    rol_revisor     public.vac_rol_enum NOT NULL,   -- rol con el que revisó
    accion          public.vac_accion_enum NOT NULL,
    comentario      character varying(500),         -- obligatorio si accion='Rechazado'
    fecha_revision  timestamp DEFAULT now() NOT NULL,
    CONSTRAINT vac_revision_comentario_check
        CHECK (accion <> 'Rechazado' OR comentario IS NOT NULL)
);

CREATE SEQUENCE public.vac_revision_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.vac_revision_id_seq OWNED BY public.vac_revision.id;
ALTER TABLE ONLY public.vac_revision ALTER COLUMN id SET DEFAULT nextval('public.vac_revision_id_seq'::regclass);

ALTER TABLE ONLY public.vac_revision
    ADD CONSTRAINT vac_revision_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vac_revision
    ADD CONSTRAINT vac_revision_id_solicitud_fkey
        FOREIGN KEY (id_solicitud) REFERENCES public.vac_solicitud(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.vac_revision
    ADD CONSTRAINT vac_revision_id_usuario_fkey
        FOREIGN KEY (id_usuario) REFERENCES public.usuario(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;
