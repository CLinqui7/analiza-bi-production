# Despliegue con Docker

Analiza Intelligence es una app Next.js. Para llevarla a un servidor, se construye una imagen Docker, se publica en Docker Hub y el servidor ejecuta esa imagen con variables de entorno reales.

El modo `standalone` de Next.js se activa solo durante la construccion Docker usando `BUILD_STANDALONE=true`. En plataformas como Vercel o Netlify, la app se construye con el flujo normal de Next.js.

## 1. Preparar el entorno

1. Copiar `.env.docker.example` como `.env.docker`.
2. Completar los valores reales de Supabase.
3. Completar `OPENAI_API_KEY` si AnaliA debe responder con IA real.
4. Cambiar `DOCKER_IMAGE` por el repositorio de Docker Hub.

Ejemplo:

```bash
cp .env.docker.example .env.docker
```

## 2. Probar localmente con Docker Compose

```bash
docker compose --env-file .env.docker up --build
```

La app quedara disponible en:

```text
http://localhost:3001
```

## 3. Construir la imagen para Docker Hub

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -t "$DOCKER_IMAGE" .
```

Si se usa `.env.docker`, exportar sus variables antes de construir:

```bash
set -a
source .env.docker
set +a
```

## 4. Subir la imagen a Docker Hub

```bash
docker login
docker push "$DOCKER_IMAGE"
```

## 5. Ejecutar en el servidor

En el servidor se crea un `.env.docker` con los mismos valores reales y luego se ejecuta:

```bash
docker pull "$DOCKER_IMAGE"
docker compose --env-file .env.docker up -d
```

## Variables importantes

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: llave publica/anon de Supabase.
- `OPENAI_API_KEY`: llave server-only para AnaliA.
- `ANALIA_OPENAI_MODEL`: modelo usado por AnaliA.
- `ANALIZA_DISABLE_DEMO_ADMIN`: en produccion debe estar en `true`.
- `APP_PORT`: puerto publico del servidor.
- `DOCKER_IMAGE`: nombre de imagen para Docker Hub.

## Como se actualizan cambios

En produccion no se edita dentro del contenedor. El flujo correcto es:

1. Hacer cambios en el codigo.
2. Probarlos.
3. Construir una nueva imagen con una etiqueta nueva.
4. Subirla a Docker Hub.
5. En el servidor hacer `docker pull` y reiniciar el servicio.

Para desarrollo en tiempo real se usa `npm run dev` o un contenedor de desarrollo con volumen local, no la imagen de produccion.
