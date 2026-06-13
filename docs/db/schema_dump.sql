--
-- PostgreSQL database dump
--

\restrict sOGouZhxZrws4FS2V1KTTb1wMTeyA4gQfLEP55VtBTGa4Oacz2QH6DkH4F4AcTS

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: dia_horario_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dia_horario_enum AS ENUM (
    'L',
    'K',
    'M',
    'J',
    'V',
    'S'
);


--
-- Name: estado_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_enum AS ENUM (
    'Activo',
    'Inactivo'
);


--
-- Name: estado_proyecto_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_proyecto_enum AS ENUM (
    'Activo',
    'Inactivo',
    'Propuesta'
);


--
-- Name: jornada_fraccion_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.jornada_fraccion_tipo AS ENUM (
    '0',
    '1/8',
    '1/4',
    '3/8',
    '1/2',
    '5/8',
    '3/4',
    '7/8',
    '1'
);


--
-- Name: regimen_salarial_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.regimen_salarial_enum AS ENUM (
    'Salario Compuesto',
    'Salario Global',
    'NaN'
);


--
-- Name: convertir_tcs_horas(public.jornada_fraccion_tipo); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.convertir_tcs_horas(fraccion public.jornada_fraccion_tipo) RETURNS real
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN CASE fraccion
    WHEN '0' THEN 0.0
    WHEN '1/8' THEN 5.0 -- 40 * 1/8
    WHEN '1/4' THEN 10.0 -- 40 * 1/4
    WHEN '3/8' THEN 15.0 -- 40 * 3/8
    WHEN '1/2' THEN 20.0 -- 40 * 1/2
    WHEN '5/8' THEN 25.0 -- 40 * 5/8
    WHEN '3/4' THEN 30.0 -- 40 * 3/4
    WHEN '7/8' THEN 35.0 -- 40 * 7/8
    WHEN '1' THEN 40.0 -- 40 * 1
    ELSE 0.0
  END;
END;
$$;


--
-- Name: prof_carga_seleccionar(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prof_carga_seleccionar(ciclo integer, prof integer) RETURNS smallint
    LANGUAGE plpgsql
    AS $$
DECLARE
  carga int2;
BEGIN
  WITH proy AS (
    SELECT COALESCE(SUM(pn.carga_horas), 0) AS total
    FROM proy_nombramiento pn
    INNER JOIN proy_ciclo pc ON pc.id = pn.id_proy_ciclo
    WHERE pc.id_ciclo = ciclo AND pn.id_profesor = prof
  ),
  admin AS (
    SELECT COALESCE(SUM(carga_horas), 0) AS total
    FROM admin_nombramiento
    WHERE id_ciclo = ciclo AND id_profesor = prof
  ),
  curso AS (
    SELECT COALESCE(SUM(cn.carga_horas), 0) AS total
    FROM curso_nombramiento cn
    INNER JOIN curso_grupo cg ON cg.id = cn.id_grupo
    WHERE cg.id_ciclo = ciclo AND cn.id_profesor = prof
  )
  SELECT (p.total + a.total + c.total)::int2
  INTO carga
  FROM proy p, admin a, curso c;

  RETURN carga;
END;
$$;


--
-- Name: prof_jornada_seleccionar(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prof_jornada_seleccionar(ciclo integer, prof integer) RETURNS real
    LANGUAGE plpgsql
    AS $$
DECLARE 
  jornadaTotal float4;
BEGIN
  WITH jornada AS (
	SELECT COALESCE(SUM(convertir_tcs_horas(jornada_fraccion) + CAST(jornada_horas AS float4)), 0) AS total
  	FROM prof_jornada
  	WHERE id_ciclo = ciclo AND id_profesor = prof
  ),
  coberturas AS (
	SELECT
		COALESCE(SUM(CASE WHEN id_becario = prof THEN convertir_tcs_horas(fraccion_cobertura) ELSE 0 END), 0) AS becario_total,
		COALESCE(SUM(CASE WHEN id_cubriendo = prof THEN convertir_tcs_horas(fraccion_cobertura) ELSE 0 END), 0) AS cubriendo_total
  	FROM prof_cobertura
  	WHERE id_ciclo = ciclo AND (id_becario = prof OR id_cubriendo = prof)
  )
  SELECT GREATEST(j.total - c.becario_total, 0) + c.cubriendo_total
  INTO jornadaTotal
  FROM jornada j, coberturas c;
  
  RETURN jornadaTotal;
END;
$$;


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
-- Name: admin_nombramiento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_nombramiento (
    id integer NOT NULL,
    id_profesor integer NOT NULL,
    id_cargo integer NOT NULL,
    id_ciclo integer NOT NULL,
    id_puesto integer,
    carga_horas smallint DEFAULT 0 NOT NULL,
    ref_doc character varying(20),
    vigencia_inicio date NOT NULL,
    vigencia_fin date NOT NULL
);


--
-- Name: admin_nombramiento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_nombramiento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_nombramiento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_nombramiento_id_seq OWNED BY public.admin_nombramiento.id;


--
-- Name: admin_puesto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_puesto (
    id integer NOT NULL,
    id_cargo integer NOT NULL,
    nombre character varying(100) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: admin_puesto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_puesto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_puesto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_puesto_id_seq OWNED BY public.admin_puesto.id;


--
-- Name: administrativo_cargo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administrativo_cargo (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: administrativo_cargo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.administrativo_cargo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: administrativo_cargo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.administrativo_cargo_id_seq OWNED BY public.administrativo_cargo.id;


--
-- Name: ciclo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ciclo (
    id integer NOT NULL,
    periodo smallint NOT NULL,
    anno smallint NOT NULL
);


--
-- Name: ciclo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ciclo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ciclo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ciclo_id_seq OWNED BY public.ciclo.id;


--
-- Name: curso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curso (
    id integer NOT NULL,
    sigla character varying(6) NOT NULL,
    nombre character varying(100) NOT NULL,
    id_departamento integer NOT NULL,
    creditaje smallint,
    horas smallint DEFAULT 0 NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: curso_grupo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curso_grupo (
    id integer NOT NULL,
    id_curso integer NOT NULL,
    id_ciclo integer NOT NULL,
    numero smallint NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: curso_grupo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.curso_grupo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: curso_grupo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.curso_grupo_id_seq OWNED BY public.curso_grupo.id;


--
-- Name: curso_horario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curso_horario (
    id integer NOT NULL,
    id_grupo integer NOT NULL,
    dia public.dia_horario_enum NOT NULL,
    id_edificio integer,
    aula character varying(3),
    hora_entrada smallint,
    hora_salida smallint
);


--
-- Name: curso_horario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.curso_horario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: curso_horario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.curso_horario_id_seq OWNED BY public.curso_horario.id;


--
-- Name: curso_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.curso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: curso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.curso_id_seq OWNED BY public.curso.id;


--
-- Name: curso_nombramiento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curso_nombramiento (
    id integer NOT NULL,
    id_grupo integer NOT NULL,
    id_profesor integer NOT NULL,
    carga_horas smallint DEFAULT 0 NOT NULL,
    observacion character varying(50)
);


--
-- Name: curso_nombramiento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.curso_nombramiento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: curso_nombramiento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.curso_nombramiento_id_seq OWNED BY public.curso_nombramiento.id;


--
-- Name: departamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamento (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: departamento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departamento_id_seq OWNED BY public.departamento.id;


--
-- Name: edificio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edificio (
    id integer NOT NULL,
    sigla_edificio character varying(2) NOT NULL,
    nombre character varying(50) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: edificio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.edificio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edificio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.edificio_id_seq OWNED BY public.edificio.id;


--
-- Name: presupuesto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuesto (
    id integer NOT NULL,
    descripcion character varying(100) NOT NULL,
    orden smallint NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: presupuesto_configuracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuesto_configuracion (
    id integer NOT NULL,
    id_presupuesto integer NOT NULL,
    id_ciclo integer NOT NULL,
    tcs numeric(5,3) DEFAULT '0'::numeric NOT NULL,
    horas integer DEFAULT 0 NOT NULL
);


--
-- Name: presupuesto_configuracion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presupuesto_configuracion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presupuesto_configuracion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presupuesto_configuracion_id_seq OWNED BY public.presupuesto_configuracion.id;


--
-- Name: presupuesto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presupuesto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presupuesto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presupuesto_id_seq OWNED BY public.presupuesto.id;


--
-- Name: presupuesto_plaza; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuesto_plaza (
    id integer NOT NULL,
    id_presupuesto_configuracion integer NOT NULL,
    "numPlaza" character varying(50) NOT NULL,
    jornada_plaza public.jornada_fraccion_tipo NOT NULL
);


--
-- Name: presupuesto_plaza_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presupuesto_plaza_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presupuesto_plaza_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presupuesto_plaza_id_seq OWNED BY public.presupuesto_plaza.id;


--
-- Name: prof_categoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prof_categoria (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: prof_categoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prof_categoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prof_categoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prof_categoria_id_seq OWNED BY public.prof_categoria.id;


--
-- Name: prof_cobertura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prof_cobertura (
    id_ciclo integer NOT NULL,
    id_becario integer NOT NULL,
    id_cubriendo integer NOT NULL,
    fraccion_cobertura public.jornada_fraccion_tipo NOT NULL,
    id_presupuesto integer NOT NULL
);


--
-- Name: prof_condicion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prof_condicion (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: prof_condicion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prof_condicion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prof_condicion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prof_condicion_id_seq OWNED BY public.prof_condicion.id;


--
-- Name: prof_estado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prof_estado (
    id_profesor integer NOT NULL,
    id_ciclo integer NOT NULL,
    id_condicion integer NOT NULL,
    id_grado integer NOT NULL,
    id_categoria integer NOT NULL
);


--
-- Name: prof_grado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prof_grado (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: prof_grado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prof_grado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prof_grado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prof_grado_id_seq OWNED BY public.prof_grado.id;


--
-- Name: prof_jornada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prof_jornada (
    id_profesor integer NOT NULL,
    id_ciclo integer NOT NULL,
    id_presupuesto integer NOT NULL,
    jornada_horas smallint DEFAULT 0 NOT NULL,
    jornada_fraccion public.jornada_fraccion_tipo NOT NULL,
    id_plaza integer
);


--
-- Name: profesor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profesor (
    id integer NOT NULL,
    identificacion character varying(20) NOT NULL,
    nombre character varying(20) NOT NULL,
    apellido1 character varying(15) NOT NULL,
    apellido2 character varying(15),
    telefonomovil character varying(15),
    telefonocasa character varying(15),
    telefonooficina character varying(15),
    email_institucional character varying(250),
    email_personal character varying(250),
    oficina character varying(10),
    casillero character varying(6),
    fecha_nombramiento date,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL,
    especialidad character varying(50),
    titulo1 character varying(100),
    otro_trabajo character varying(50),
    titulo2 character varying(100),
    otra_info character varying(200),
    regimen_salarial public.regimen_salarial_enum NOT NULL
);


--
-- Name: profesor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profesor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profesor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profesor_id_seq OWNED BY public.profesor.id;


--
-- Name: proy_centro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proy_centro (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: proy_centro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proy_centro_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proy_centro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proy_centro_id_seq OWNED BY public.proy_centro.id;


--
-- Name: proy_ciclo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proy_ciclo (
    id integer NOT NULL,
    id_proyecto integer NOT NULL,
    id_ciclo integer NOT NULL
);


--
-- Name: proy_ciclo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proy_ciclo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proy_ciclo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proy_ciclo_id_seq OWNED BY public.proy_ciclo.id;


--
-- Name: proy_nombramiento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proy_nombramiento (
    id integer NOT NULL,
    id_profesor integer NOT NULL,
    id_puesto integer NOT NULL,
    carga_horas smallint DEFAULT 0 NOT NULL,
    ref_doc character varying(20),
    vigencia_inicio date NOT NULL,
    vigencia_fin date NOT NULL,
    id_proy_ciclo integer NOT NULL
);


--
-- Name: proy_nombramiento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proy_nombramiento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proy_nombramiento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proy_nombramiento_id_seq OWNED BY public.proy_nombramiento.id;


--
-- Name: proy_puesto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proy_puesto (
    id integer NOT NULL,
    id_tipo integer NOT NULL,
    nombre character varying(50) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: proy_puesto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proy_puesto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proy_puesto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proy_puesto_id_seq OWNED BY public.proy_puesto.id;


--
-- Name: proy_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proy_tipo (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    estado public.estado_enum DEFAULT 'Activo'::public.estado_enum NOT NULL
);


--
-- Name: proy_tipo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proy_tipo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proy_tipo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proy_tipo_id_seq OWNED BY public.proy_tipo.id;


--
-- Name: proyecto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proyecto (
    id integer NOT NULL,
    codigo character varying(20),
    id_tipo integer,
    id_centro integer,
    nombre character varying(100) NOT NULL,
    descripcion character varying(100),
    vigencia_inicio date,
    vigencia_fin date,
    ref_doc character varying(20),
    estado public.estado_proyecto_enum DEFAULT 'Activo'::public.estado_proyecto_enum NOT NULL,
    CONSTRAINT proyecto_estado_check CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text, ('Propuesta'::character varying)::text])))
);


--
-- Name: proyecto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proyecto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proyecto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proyecto_id_seq OWNED BY public.proyecto.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: admin_nombramiento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_nombramiento ALTER COLUMN id SET DEFAULT nextval('public.admin_nombramiento_id_seq'::regclass);


--
-- Name: admin_puesto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_puesto ALTER COLUMN id SET DEFAULT nextval('public.admin_puesto_id_seq'::regclass);


--
-- Name: administrativo_cargo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrativo_cargo ALTER COLUMN id SET DEFAULT nextval('public.administrativo_cargo_id_seq'::regclass);


--
-- Name: ciclo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciclo ALTER COLUMN id SET DEFAULT nextval('public.ciclo_id_seq'::regclass);


--
-- Name: curso id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso ALTER COLUMN id SET DEFAULT nextval('public.curso_id_seq'::regclass);


--
-- Name: curso_grupo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_grupo ALTER COLUMN id SET DEFAULT nextval('public.curso_grupo_id_seq'::regclass);


--
-- Name: curso_horario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_horario ALTER COLUMN id SET DEFAULT nextval('public.curso_horario_id_seq'::regclass);


--
-- Name: curso_nombramiento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_nombramiento ALTER COLUMN id SET DEFAULT nextval('public.curso_nombramiento_id_seq'::regclass);


--
-- Name: departamento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento ALTER COLUMN id SET DEFAULT nextval('public.departamento_id_seq'::regclass);


--
-- Name: edificio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificio ALTER COLUMN id SET DEFAULT nextval('public.edificio_id_seq'::regclass);


--
-- Name: presupuesto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto ALTER COLUMN id SET DEFAULT nextval('public.presupuesto_id_seq'::regclass);


--
-- Name: presupuesto_configuracion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_configuracion ALTER COLUMN id SET DEFAULT nextval('public.presupuesto_configuracion_id_seq'::regclass);


--
-- Name: presupuesto_plaza id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_plaza ALTER COLUMN id SET DEFAULT nextval('public.presupuesto_plaza_id_seq'::regclass);


--
-- Name: prof_categoria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_categoria ALTER COLUMN id SET DEFAULT nextval('public.prof_categoria_id_seq'::regclass);


--
-- Name: prof_condicion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_condicion ALTER COLUMN id SET DEFAULT nextval('public.prof_condicion_id_seq'::regclass);


--
-- Name: prof_grado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_grado ALTER COLUMN id SET DEFAULT nextval('public.prof_grado_id_seq'::regclass);


--
-- Name: profesor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor ALTER COLUMN id SET DEFAULT nextval('public.profesor_id_seq'::regclass);


--
-- Name: proy_centro id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_centro ALTER COLUMN id SET DEFAULT nextval('public.proy_centro_id_seq'::regclass);


--
-- Name: proy_ciclo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_ciclo ALTER COLUMN id SET DEFAULT nextval('public.proy_ciclo_id_seq'::regclass);


--
-- Name: proy_nombramiento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_nombramiento ALTER COLUMN id SET DEFAULT nextval('public.proy_nombramiento_id_seq'::regclass);


--
-- Name: proy_puesto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_puesto ALTER COLUMN id SET DEFAULT nextval('public.proy_puesto_id_seq'::regclass);


--
-- Name: proy_tipo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_tipo ALTER COLUMN id SET DEFAULT nextval('public.proy_tipo_id_seq'::regclass);


--
-- Name: proyecto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto ALTER COLUMN id SET DEFAULT nextval('public.proyecto_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_nombramiento admin_nombramiento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_nombramiento
    ADD CONSTRAINT admin_nombramiento_pkey PRIMARY KEY (id);


--
-- Name: admin_nombramiento admin_nombramiento_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_nombramiento
    ADD CONSTRAINT admin_nombramiento_unique UNIQUE (id_profesor, id_cargo, id_ciclo);


--
-- Name: admin_puesto admin_puesto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_puesto
    ADD CONSTRAINT admin_puesto_pkey PRIMARY KEY (id);


--
-- Name: administrativo_cargo administrativo_cargo_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrativo_cargo
    ADD CONSTRAINT administrativo_cargo_nombre_unique UNIQUE (nombre);


--
-- Name: administrativo_cargo administrativo_cargo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrativo_cargo
    ADD CONSTRAINT administrativo_cargo_pkey PRIMARY KEY (id);


--
-- Name: ciclo ciclo_periodo_anno_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciclo
    ADD CONSTRAINT ciclo_periodo_anno_unique UNIQUE (periodo, anno);


--
-- Name: ciclo ciclo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciclo
    ADD CONSTRAINT ciclo_pkey PRIMARY KEY (id);


--
-- Name: curso_grupo curso_grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_grupo
    ADD CONSTRAINT curso_grupo_pkey PRIMARY KEY (id);


--
-- Name: curso_horario curso_horario_dia_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_horario
    ADD CONSTRAINT curso_horario_dia_unique UNIQUE (id_grupo, dia);


--
-- Name: curso_horario curso_horario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_horario
    ADD CONSTRAINT curso_horario_pkey PRIMARY KEY (id);


--
-- Name: curso_nombramiento curso_nombramiento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_nombramiento
    ADD CONSTRAINT curso_nombramiento_pkey PRIMARY KEY (id);


--
-- Name: curso_nombramiento curso_nombramiento_profesor_grupo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_nombramiento
    ADD CONSTRAINT curso_nombramiento_profesor_grupo_unique UNIQUE (id_grupo, id_profesor);


--
-- Name: curso curso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT curso_pkey PRIMARY KEY (id);


--
-- Name: curso curso_sigla_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT curso_sigla_unique UNIQUE (sigla);


--
-- Name: departamento departamento_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT departamento_nombre_unique UNIQUE (nombre);


--
-- Name: departamento departamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT departamento_pkey PRIMARY KEY (id);


--
-- Name: edificio edificio_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificio
    ADD CONSTRAINT edificio_nombre_unique UNIQUE (nombre);


--
-- Name: edificio edificio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificio
    ADD CONSTRAINT edificio_pkey PRIMARY KEY (id);


--
-- Name: edificio edificio_sigla_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificio
    ADD CONSTRAINT edificio_sigla_unique UNIQUE (sigla_edificio);


--
-- Name: presupuesto_configuracion presupuesto_configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_configuracion
    ADD CONSTRAINT presupuesto_configuracion_pkey PRIMARY KEY (id);


--
-- Name: presupuesto_configuracion presupuesto_configuracion_presupuesto_ciclo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_configuracion
    ADD CONSTRAINT presupuesto_configuracion_presupuesto_ciclo_unique UNIQUE (id_presupuesto, id_ciclo);


--
-- Name: presupuesto presupuesto_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT presupuesto_orden_key UNIQUE (orden);


--
-- Name: presupuesto presupuesto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT presupuesto_pkey PRIMARY KEY (id);


--
-- Name: presupuesto_plaza presupuesto_plaza_num_plaza_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_plaza
    ADD CONSTRAINT presupuesto_plaza_num_plaza_unique UNIQUE ("numPlaza");


--
-- Name: presupuesto_plaza presupuesto_plaza_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_plaza
    ADD CONSTRAINT presupuesto_plaza_pkey PRIMARY KEY (id);


--
-- Name: prof_categoria prof_categoria_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_categoria
    ADD CONSTRAINT prof_categoria_nombre_unique UNIQUE (nombre);


--
-- Name: prof_categoria prof_categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_categoria
    ADD CONSTRAINT prof_categoria_pkey PRIMARY KEY (id);


--
-- Name: prof_cobertura prof_cobertura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_cobertura
    ADD CONSTRAINT prof_cobertura_pkey PRIMARY KEY (id_ciclo, id_becario, id_cubriendo);


--
-- Name: prof_condicion prof_condicion_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_condicion
    ADD CONSTRAINT prof_condicion_nombre_unique UNIQUE (nombre);


--
-- Name: prof_condicion prof_condicion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_condicion
    ADD CONSTRAINT prof_condicion_pkey PRIMARY KEY (id);


--
-- Name: prof_estado prof_estado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_estado
    ADD CONSTRAINT prof_estado_pkey PRIMARY KEY (id_profesor, id_ciclo);


--
-- Name: prof_grado prof_grado_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_grado
    ADD CONSTRAINT prof_grado_nombre_unique UNIQUE (nombre);


--
-- Name: prof_grado prof_grado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_grado
    ADD CONSTRAINT prof_grado_pkey PRIMARY KEY (id);


--
-- Name: prof_jornada prof_jornada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_jornada
    ADD CONSTRAINT prof_jornada_pkey PRIMARY KEY (id_profesor, id_ciclo, id_presupuesto);


--
-- Name: profesor profesor_email_institucional_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_email_institucional_unique UNIQUE (email_institucional);


--
-- Name: profesor profesor_email_personal_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_email_personal_unique UNIQUE (email_personal);


--
-- Name: profesor profesor_identificacion_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_identificacion_unique UNIQUE (identificacion);


--
-- Name: profesor profesor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_pkey PRIMARY KEY (id);


--
-- Name: profesor profesor_telefono_movil_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_telefono_movil_unique UNIQUE (telefonomovil);


--
-- Name: proy_centro proy_centro_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_centro
    ADD CONSTRAINT proy_centro_nombre_unique UNIQUE (nombre);


--
-- Name: proy_centro proy_centro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_centro
    ADD CONSTRAINT proy_centro_pkey PRIMARY KEY (id);


--
-- Name: proy_ciclo proy_ciclo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_ciclo
    ADD CONSTRAINT proy_ciclo_pkey PRIMARY KEY (id);


--
-- Name: proy_ciclo proy_ciclo_proyecto_ciclo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_ciclo
    ADD CONSTRAINT proy_ciclo_proyecto_ciclo_unique UNIQUE (id_proyecto, id_ciclo);


--
-- Name: proy_nombramiento proy_nombramiento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_nombramiento
    ADD CONSTRAINT proy_nombramiento_pkey PRIMARY KEY (id);


--
-- Name: proy_nombramiento proy_nombramiento_profesor_proy_ciclo_puesto_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_nombramiento
    ADD CONSTRAINT proy_nombramiento_profesor_proy_ciclo_puesto_unique UNIQUE (id_profesor, id_puesto, id_proy_ciclo);


--
-- Name: proy_puesto proy_puesto_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_puesto
    ADD CONSTRAINT proy_puesto_id_nombre_unique UNIQUE (id_tipo, nombre);


--
-- Name: proy_puesto proy_puesto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_puesto
    ADD CONSTRAINT proy_puesto_pkey PRIMARY KEY (id);


--
-- Name: proy_tipo proy_tipo_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_tipo
    ADD CONSTRAINT proy_tipo_nombre_unique UNIQUE (nombre);


--
-- Name: proy_tipo proy_tipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_tipo
    ADD CONSTRAINT proy_tipo_pkey PRIMARY KEY (id);


--
-- Name: proyecto proyecto_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto
    ADD CONSTRAINT proyecto_codigo_unique UNIQUE (codigo);


--
-- Name: proyecto proyecto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto
    ADD CONSTRAINT proyecto_pkey PRIMARY KEY (id);


--
-- Name: curso_grupo uq_curso_grupo_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_grupo
    ADD CONSTRAINT uq_curso_grupo_numero UNIQUE (id_curso, id_ciclo, numero);


--
-- Name: admin_nombramiento admin_nombramiento_id_cargo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_nombramiento
    ADD CONSTRAINT admin_nombramiento_id_cargo_fkey FOREIGN KEY (id_cargo) REFERENCES public.administrativo_cargo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: admin_nombramiento admin_nombramiento_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_nombramiento
    ADD CONSTRAINT admin_nombramiento_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: admin_nombramiento admin_nombramiento_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_nombramiento
    ADD CONSTRAINT admin_nombramiento_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: admin_nombramiento admin_nombramiento_id_puesto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_nombramiento
    ADD CONSTRAINT admin_nombramiento_id_puesto_fkey FOREIGN KEY (id_puesto) REFERENCES public.admin_puesto(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: admin_puesto admin_puesto_id_cargo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_puesto
    ADD CONSTRAINT admin_puesto_id_cargo_fkey FOREIGN KEY (id_cargo) REFERENCES public.administrativo_cargo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: curso_grupo curso_grupo_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_grupo
    ADD CONSTRAINT curso_grupo_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: curso_grupo curso_grupo_id_curso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_grupo
    ADD CONSTRAINT curso_grupo_id_curso_fkey FOREIGN KEY (id_curso) REFERENCES public.curso(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: curso_horario curso_horario_id_edificio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_horario
    ADD CONSTRAINT curso_horario_id_edificio_fkey FOREIGN KEY (id_edificio) REFERENCES public.edificio(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: curso_horario curso_horario_id_grupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_horario
    ADD CONSTRAINT curso_horario_id_grupo_fkey FOREIGN KEY (id_grupo) REFERENCES public.curso_grupo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: curso curso_id_departamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT curso_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES public.departamento(id) ON DELETE RESTRICT;


--
-- Name: curso_nombramiento curso_nombramiento_id_grupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_nombramiento
    ADD CONSTRAINT curso_nombramiento_id_grupo_fkey FOREIGN KEY (id_grupo) REFERENCES public.curso_grupo(id);


--
-- Name: presupuesto_configuracion presupuesto_configuracion_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_configuracion
    ADD CONSTRAINT presupuesto_configuracion_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclo(id);


--
-- Name: presupuesto_configuracion presupuesto_configuracion_id_presupuesto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_configuracion
    ADD CONSTRAINT presupuesto_configuracion_id_presupuesto_fkey FOREIGN KEY (id_presupuesto) REFERENCES public.presupuesto(id);


--
-- Name: presupuesto_plaza presupuesto_plaza_id_presupuesto_configuracion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_plaza
    ADD CONSTRAINT presupuesto_plaza_id_presupuesto_configuracion_fkey FOREIGN KEY (id_presupuesto_configuracion) REFERENCES public.presupuesto_configuracion(id) ON DELETE CASCADE;


--
-- Name: prof_cobertura prof_cobertura_id_becario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_cobertura
    ADD CONSTRAINT prof_cobertura_id_becario_fkey FOREIGN KEY (id_becario) REFERENCES public.profesor(id);


--
-- Name: prof_cobertura prof_cobertura_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_cobertura
    ADD CONSTRAINT prof_cobertura_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclo(id);


--
-- Name: prof_cobertura prof_cobertura_id_cubriendo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_cobertura
    ADD CONSTRAINT prof_cobertura_id_cubriendo_fkey FOREIGN KEY (id_cubriendo) REFERENCES public.profesor(id);


--
-- Name: prof_cobertura prof_cobertura_id_presupuesto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_cobertura
    ADD CONSTRAINT prof_cobertura_id_presupuesto_fkey FOREIGN KEY (id_presupuesto) REFERENCES public.presupuesto(id);


--
-- Name: prof_estado prof_estado_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_estado
    ADD CONSTRAINT prof_estado_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclo(id);


--
-- Name: prof_estado prof_estado_id_categoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_estado
    ADD CONSTRAINT prof_estado_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.prof_categoria(id) ON DELETE RESTRICT;


--
-- Name: prof_estado prof_estado_id_condicion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_estado
    ADD CONSTRAINT prof_estado_id_condicion_fkey FOREIGN KEY (id_condicion) REFERENCES public.prof_condicion(id) ON DELETE RESTRICT;


--
-- Name: prof_estado prof_estado_id_grado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_estado
    ADD CONSTRAINT prof_estado_id_grado_fkey FOREIGN KEY (id_grado) REFERENCES public.prof_grado(id) ON DELETE RESTRICT;


--
-- Name: prof_jornada prof_jornada_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_jornada
    ADD CONSTRAINT prof_jornada_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclo(id);


--
-- Name: prof_jornada prof_jornada_id_plaza_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_jornada
    ADD CONSTRAINT prof_jornada_id_plaza_fkey FOREIGN KEY (id_plaza) REFERENCES public.presupuesto_plaza(id) ON DELETE RESTRICT;


--
-- Name: prof_jornada prof_jornada_id_presupuesto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_jornada
    ADD CONSTRAINT prof_jornada_id_presupuesto_fkey FOREIGN KEY (id_presupuesto) REFERENCES public.presupuesto(id);


--
-- Name: prof_jornada prof_jornada_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prof_jornada
    ADD CONSTRAINT prof_jornada_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id);


--
-- Name: curso_nombramiento profesor_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso_nombramiento
    ADD CONSTRAINT profesor_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id);


--
-- Name: proy_ciclo proy_ciclo_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_ciclo
    ADD CONSTRAINT proy_ciclo_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclo(id) ON DELETE RESTRICT;


--
-- Name: proy_ciclo proy_ciclo_id_proyecto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_ciclo
    ADD CONSTRAINT proy_ciclo_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id) ON DELETE CASCADE;


--
-- Name: proy_nombramiento proy_nombramiento_admin_puesto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_nombramiento
    ADD CONSTRAINT proy_nombramiento_admin_puesto_fkey FOREIGN KEY (id_puesto) REFERENCES public.proy_puesto(id);


--
-- Name: proy_nombramiento proy_nombramiento_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_nombramiento
    ADD CONSTRAINT proy_nombramiento_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id);


--
-- Name: proy_nombramiento proy_nombramiento_id_proy_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_nombramiento
    ADD CONSTRAINT proy_nombramiento_id_proy_ciclo_fkey FOREIGN KEY (id_proy_ciclo) REFERENCES public.proy_ciclo(id) ON DELETE RESTRICT;


--
-- Name: proy_puesto proy_puesto_id_tipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proy_puesto
    ADD CONSTRAINT proy_puesto_id_tipo_fkey FOREIGN KEY (id_tipo) REFERENCES public.proy_tipo(id);


--
-- Name: proyecto proyecto_id_centro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto
    ADD CONSTRAINT proyecto_id_centro_fkey FOREIGN KEY (id_centro) REFERENCES public.proy_centro(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: proyecto proyecto_id_tipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto
    ADD CONSTRAINT proyecto_id_tipo_fkey FOREIGN KEY (id_tipo) REFERENCES public.proy_tipo(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict sOGouZhxZrws4FS2V1KTTb1wMTeyA4gQfLEP55VtBTGa4Oacz2QH6DkH4F4AcTS

