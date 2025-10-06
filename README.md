# Enterprise SQL Dashboard

A mobile-first React and Node.js starter kit that connects securely to an on-premises Microsoft SQL Server while
emitting operational telemetry to the Windows Event Log.

## Project structure

```
TestCodex/
├── client/   # Vite + React single-page application
└── server/   # Express API with SQL Server connectivity and Windows logging
```

## Getting started

### Prerequisites

- Node.js 18+
- Access to an on-premises SQL Server instance reachable from the API host
- Windows Server (recommended) when running the API to forward events to the Windows Event Log

### Install dependencies

```
cd client
npm install

cd ../server
npm install
```

> **Note:** When deploying the API to Windows, ensure `winston-eventlog` is able to write to the Application log. Run the
> process with appropriate privileges.

### Configure environment

Create `server/.env` with your SQL Server credentials:

```
PORT=4000
SQL_SERVER=tcp://sqlserver.internal:1433
SQL_DATABASE=AdventureWorks
SQL_USER=readonly.user
SQL_PASSWORD=SuperSecretPassword!
SQL_DOMAIN=CONTOSO
SQL_ENCRYPT=true
```

### Run the development servers

Start the backend API first:

```
cd server
npm run dev
```

Then launch the React app (in a new terminal):

```
cd client
npm run dev
```

The React app proxies `/api` calls to `http://localhost:4000`.

## Production deployment

1. Deploy the Express API to a Windows Server. Install it as a Windows Service or run it behind IIS using the ARR module.
2. Ensure the service account has permission to access SQL Server and write to the Windows Event Log.
3. Build the React application with `npm run build` (inside `client`) and host the contents of `client/dist` on your chosen
   web server or CDN.
4. Configure HTTPS for both the API and the static site. Rotate credentials through your organization’s secret management
   solution.

## Security considerations

- All SQL statements should be parameterized. The provided API uses a simple `.query` call for demo purposes—extend it with
  parameter binding before production use.
- Restrict API access through VPN or private connectivity solutions such as Azure ExpressRoute.
- Audit the Windows Event Viewer to monitor connection attempts and query execution histories.
