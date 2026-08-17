# App de gestión de la cofradía/asociación

Aplicación web responsive (funciona en móvil, tablet y PC desde el mismo
código) con backend en Node.js/TypeScript + PostgreSQL, lista para
convertirse en app Android/iOS con Capacitor.

Incluye: login, usuarios y permisos, socios, caja (movimientos,
retiradas, cierres), cuentas bancarias, tesorería (ingresos/gastos),
ventas con modo venta rápida y control de stock transaccional,
productos, lotería, cuotas (con generación automática por socio),
donativos, eventos, documentos (subida de archivos), dashboard,
auditoría de solo lectura e informes exportables a CSV/Excel/PDF.

**Verificación realizada antes de entregarlo**: se ha instalado y
compilado el frontend (`tsc` + `vite build`, sin errores) y se ha
comprobado el backend con `tsc --noEmit`. El único punto que no he
podido verificar en este entorno es la descarga del motor binario de
Prisma (bloqueada por las restricciones de red de este sandbox); se
descarga solo con conexión normal a internet, con el primer
`npx prisma generate` que hagas tú (ver paso 2 más abajo).

Notificaciones push y la app iOS quedan para una fase futura (dependen
de servicios externos: notificaciones push y una cuenta de desarrollador
Apple), tal como se indicaba en el plan por fases.

---

## 1. Qué hay en esta carpeta

```
cofradia-app/
├── backend/     API en Node.js + TypeScript + Prisma + PostgreSQL
├── frontend/    App React (PWA), responsive para móvil/tablet/PC
├── docker-compose.yml
└── .env.example
```

---

## 2. Probarlo en tu ordenador (antes de publicar)

Necesitas tener instalado **Docker Desktop** (incluye Docker Compose).

1. Copia el archivo de variables de entorno:
   ```
   cp .env.example .env
   ```
   Abre `.env` y cambia `POSTGRES_PASSWORD`, `JWT_SECRET` y
   `JWT_REFRESH_SECRET` por valores propios (cualquier texto largo y
   aleatorio sirve).

2. Levanta todo:
   ```
   docker compose up -d --build
   ```
   Esto crea 3 contenedores: la base de datos PostgreSQL, la API
   (backend) y la web (frontend + nginx) en el puerto 80.

3. Crea las tablas en la base de datos (solo la primera vez):
   ```
   docker compose exec backend npx prisma migrate deploy
   ```
   Si es la primerísima vez y no existe ninguna migración todavía:
   ```
   docker compose exec backend npx prisma migrate dev --name init
   ```

4. Carga los datos iniciales (roles, permisos y usuario administrador):
   ```
   docker compose exec backend npm run seed
   ```
   Esto crea el usuario:
   - Email: `admin@cofradia.local`
   - Contraseña: `CambiaEstaClave123!`

   **Entra y cambia esa contraseña cuanto antes** (desde Administración →
   Usuarios, una vez esté implementada esa pantalla, o directamente en
   base de datos).

5. Abre `http://localhost` en el navegador. Desde el móvil de la misma
   red wifi, entra a `http://IP-DE-TU-ORDENADOR` (ej. `http://192.168.1.20`).

---

## 3. Cómo publicarlo en internet (para que la junta lo use desde fuera de casa)

La forma más sencilla y barata es un **VPS** (servidor virtual). Opciones
habituales: Hetzner, DigitalOcean, Contabo, OVH. Con el plan más básico
(1-2 €/mes en Hetzner, unos 4-6 $/mes en DigitalOcean) es más que
suficiente para una asociación de pueblo.

### Pasos

1. **Contrata el VPS** con Ubuntu 22.04 o 24.04.

2. **Conéctate por SSH** e instala Docker:
   ```
   curl -fsSL https://get.docker.com | sh
   ```

3. **Compra un dominio** (ej. en Namecheap, OVH, o tu gestor habitual):
   algo como `gestion-cofradia.es`, y apunta su registro DNS tipo `A`
   a la IP pública de tu VPS.

4. **Sube esta carpeta al servidor**, por ejemplo con `scp` o `git`:
   ```
   scp -r cofradia-app usuario@TU_IP:/home/usuario/
   ```

5. En el servidor, repite los pasos de la sección 2 (`.env`, 
   `docker compose up -d --build`, migraciones, seed).

6. **Añade HTTPS gratis con Let's Encrypt.** La forma más simple es
   poner delante un proxy como **Caddy** (gestiona el certificado solo)
   o usar **Nginx Proxy Manager**. Ejemplo con Caddy en el propio VPS
   (fuera de Docker Compose, apuntando al puerto 80 de este proyecto):
   ```
   caddy reverse-proxy --from gestion-cofradia.es --to localhost:80
   ```
   O bien, si prefieres todo en Docker, se puede añadir un contenedor
   `caddy` al `docker-compose.yml` — dilo y te lo preparo.

7. Ya tendrás la app accesible en `https://gestion-cofradia.es` desde
   cualquier móvil, tablet u ordenador con internet.

### Alternativa sin gestionar servidor tú mismo

Si prefieres no tocar terminal ni VPS:
- **Backend + base de datos**: Railway o Render (ambos permiten
  desplegar Node.js + PostgreSQL gestionado con pocos clics).
- **Frontend**: Vercel o Netlify (build de `frontend/` con variable
  `VITE_API_URL` apuntando a la URL del backend desplegado).

Es más cómodo al principio, pero suele salir más caro a medida que
crece el uso, y tienes menos control sobre backups y datos.

---

## 4. Base de datos: qué es y cómo se gestiona

La app usa **PostgreSQL**, una base de datos relacional gratuita y muy
usada en producción.

- **En desarrollo/pruebas**: la crea automáticamente el contenedor `db`
  del `docker-compose.yml`, con los datos guardados en un volumen
  Docker (`db_data`) que persiste aunque reinicies los contenedores.
- **En producción**: es la misma base de datos, corriendo en tu VPS.
  No necesitas "comprar" una base de datos aparte a menos que prefieras
  un servicio gestionado (ver alternativa Railway/Render arriba).

### Comandos útiles

- Crear/actualizar las tablas según el esquema (`prisma/schema.prisma`):
  ```
  docker compose exec backend npx prisma migrate deploy
  ```
- Ver la base de datos con una interfaz visual (útil para revisar datos
  a mano):
  ```
  docker compose exec backend npx prisma studio
  ```
  Se abre en `http://localhost:5555`.

- Backup manual de la base de datos:
  ```
  docker compose exec db pg_dump -U cofradia_user cofradia_db > backup_$(date +%F).sql
  ```
- Restaurar un backup:
  ```
  cat backup_2026-08-16.sql | docker compose exec -T db psql -U cofradia_user cofradia_db
  ```
- Backup automático diario (en el VPS, fuera de Docker): añade una
  tarea programada con `cron` que ejecute el comando de `pg_dump`
  anterior cada noche y guarde el archivo fuera del servidor (ej. en
  un bucket externo o descargándolo periódicamente a tu ordenador).

---

## 5. Convertirlo en app Android (APK)

1. En tu ordenador, dentro de `frontend/`:
   ```
   npm install
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npm run build
   npx cap add android
   npx cap sync
   ```
2. Edita `capacitor.config.ts` si tu dominio de producción cambia.
3. Abre el proyecto generado en `android/` con **Android Studio** y
   genera el APK/AAB desde ahí (Build → Generate Signed Bundle/APK).

---

## 6. Siguientes pasos recomendados

1. Cambiar la contraseña del usuario admin inicial.
2. Crear los usuarios reales de la junta desde el panel de
   administración (pantalla pendiente de construir en el frontend;
   de momento se puede hacer directamente contra la API o con
   `prisma studio`).
3. Configurar backups automáticos en el VPS.
4. Cuando quieras, seguimos con la Fase 2: cuotas, donativos, eventos,
   documentos y exportación de informes a PDF/Excel.
