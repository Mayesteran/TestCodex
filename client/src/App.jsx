import { useEffect, useMemo, useState } from 'react';
import { useApi } from './hooks/useApi.js';

const defaultConnection = {
  server: 'tcp://your-sql-server:1433',
  database: 'AdventureWorks',
  domain: 'CONTOSO',
  user: 'readonly.user',
  password: '',
  encrypt: true
};

const featureCards = [
  {
    title: 'On-Prem SQL Connectivity',
    description:
      'Securely bridge your internal SQL Server by tunneling through the Node.js API using parameterized queries and encrypted connections.',
    icon: '🛡️'
  },
  {
    title: 'Windows Event Logging',
    description:
      'Operational events are forwarded to the Windows Event Viewer through the server logging pipeline powered by Winston + winston-eventlog.',
    icon: '🪟'
  },
  {
    title: 'Mobile Optimized UI',
    description:
      'Responsive cards, touch-friendly controls, and adaptive typography ensure database insights are available on the go.',
    icon: '📱'
  }
];

const sampleQueries = [
  {
    label: 'Top 5 Products by Sales',
    query: `SELECT TOP (5) Name, ListPrice FROM Production.Product ORDER BY ListPrice DESC;`
  },
  {
    label: 'Recent Orders',
    query: `SELECT TOP (10) SalesOrderID, OrderDate, TotalDue FROM Sales.SalesOrderHeader ORDER BY OrderDate DESC;`
  },
  {
    label: 'Employees On Duty',
    query: `SELECT TOP (10) p.FirstName + ' ' + p.LastName AS Employee, e.JobTitle FROM HumanResources.Employee AS e INNER JOIN Person.Person AS p ON e.BusinessEntityID = p.BusinessEntityID;`
  }
];

function StatusPill({ online, message }) {
  return (
    <span className={`status-pill ${online ? 'online' : 'offline'}`}>
      <span aria-hidden="true">{online ? '●' : '○'}</span>
      {message}
    </span>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <article className="card" style={{ padding: '1.5rem' }}>
      <div style={{ fontSize: '2rem' }} aria-hidden="true">
        {icon}
      </div>
      <h3 style={{ marginBottom: '0.35rem' }}>{title}</h3>
      <p style={{ margin: 0, color: '#475569' }}>{description}</p>
    </article>
  );
}

function LogPanel({ logs }) {
  return (
    <section className="card">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p className="badge">Windows Event Log Stream</p>
          <h2 style={{ margin: '0.5rem 0 0', fontSize: '1.35rem' }}>Operational Insights</h2>
        </div>
        <span style={{ fontSize: '2rem' }} aria-hidden="true">
          📋
        </span>
      </header>
      <div className="grid" style={{ gap: '0.85rem' }}>
        {logs.length === 0 && (
          <p style={{ margin: 0, color: '#64748b' }}>
            No log entries yet. Trigger a connection test or execute a query to see event log activity.
          </p>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            style={{
              background: 'rgba(15, 23, 42, 0.03)',
              borderRadius: '0.85rem',
              padding: '0.85rem 1rem',
              border: '1px solid rgba(148, 163, 184, 0.35)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ color: '#0f172a' }}>{log.level.toUpperCase()}</strong>
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>{new Date(log.timestamp).toLocaleString()}</span>
            </div>
            <p style={{ margin: '0.35rem 0 0', color: '#334155' }}>{log.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConnectionForm({ connection, onChange, onTest, testing }) {
  const handleInput = (event) => {
    const { name, value, type, checked } = event.target;
    onChange({ ...connection, [name]: type === 'checkbox' ? checked : value });
  };

  return (
    <section className="card">
      <header style={{ marginBottom: '1.25rem' }}>
        <p className="badge">Connectivity</p>
        <h2 style={{ margin: '0.75rem 0 0', fontSize: '1.5rem' }}>SQL Server Connection</h2>
        <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>
          Configure how the API gateway connects to your on-premises SQL Server. Credentials are never stored in the
          client; they are forwarded to the secure Node.js backend.
        </p>
      </header>
      <div className="grid" style={{ gap: '1rem' }}>
        <label style={{ display: 'block' }}>
          <span style={{ fontWeight: 600 }}>Server endpoint</span>
          <input name="server" value={connection.server} onChange={handleInput} placeholder="tcp://host:port" />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontWeight: 600 }}>Database</span>
          <input name="database" value={connection.database} onChange={handleInput} placeholder="Database name" />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontWeight: 600 }}>Domain (optional)</span>
          <input name="domain" value={connection.domain} onChange={handleInput} placeholder="Windows domain" />
        </label>
        <div className="grid grid-2" style={{ gap: '1rem' }}>
          <label style={{ display: 'block' }}>
            <span style={{ fontWeight: 600 }}>User</span>
            <input name="user" value={connection.user} onChange={handleInput} placeholder="Windows username" />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontWeight: 600 }}>Password</span>
            <input
              name="password"
              type="password"
              value={connection.password}
              onChange={handleInput}
              placeholder="Windows password"
            />
          </label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input type="checkbox" name="encrypt" checked={connection.encrypt} onChange={handleInput} />
          <span style={{ color: '#334155' }}>Encrypt connection (recommended)</span>
        </label>
      </div>
      <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button className="primary" onClick={onTest} disabled={testing}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        <button
          className="secondary"
          onClick={() => navigator.clipboard?.writeText(JSON.stringify(connection, null, 2))}
          type="button"
        >
          Copy JSON payload
        </button>
      </div>
    </section>
  );
}

function QueryWorkbench({ selectedQuery, onChange, onExecute, executing, results }) {
  const hasResults = results?.rows?.length > 0;

  return (
    <section className="card">
      <header style={{ marginBottom: '1rem' }}>
        <p className="badge" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8' }}>
          Query Workbench
        </p>
        <h2 style={{ margin: '0.75rem 0 0', fontSize: '1.45rem' }}>Craft Secure Queries</h2>
        <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>
          Select a template or author your own SQL. The backend enforces parameterization and sanitizes inputs before
          executing against SQL Server.
        </p>
      </header>
      <label style={{ display: 'block', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 600 }}>Query template</span>
        <select value={selectedQuery.label} onChange={(event) => onChange(event.target.value)}>
          {sampleQueries.map((option) => (
            <option value={option.label} key={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontWeight: 600 }}>SQL statement</span>
        <textarea
          rows={6}
          value={selectedQuery.query}
          onChange={(event) => onChange(selectedQuery.label, event.target.value)}
        />
      </label>
      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="primary" onClick={onExecute} disabled={executing}>
          {executing ? 'Running…' : 'Execute query'}
        </button>
        <button className="secondary" type="button" onClick={() => onChange(selectedQuery.label, '')}>
          Clear statement
        </button>
      </div>
      {hasResults && (
        <div style={{ marginTop: '1.75rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Results</h3>
            <span style={{ color: '#475569', fontSize: '0.9rem' }}>{results.rows.length} rows</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                {results.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {results.columns.map((column) => (
                    <td key={column}>{row[column]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function App() {
  const { request, loading, error } = useApi();
  const [connection, setConnection] = useState(defaultConnection);
  const [status, setStatus] = useState({ online: false, message: 'Offline' });
  const [logs, setLogs] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(sampleQueries[0]);
  const [results, setResults] = useState(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await request({ url: '/api/status' });
        setStatus({ online: data.online, message: data.message });
        setLogs(data.logs || []);
      } catch (err) {
        setStatus({ online: false, message: 'API offline' });
      }
    }

    fetchStatus();
  }, [request]);

  const selectedQueryObject = useMemo(() => selectedQuery, [selectedQuery]);

  const handleQueryChange = (label, override) => {
    if (typeof override === 'string') {
      setSelectedQuery((previous) => ({ ...previous, query: override }));
      return;
    }

    const template = sampleQueries.find((item) => item.label === label);
    if (template) {
      setSelectedQuery(template);
    }
  };

  const handleConnectionTest = async () => {
    try {
      const data = await request({
        url: '/api/test-connection',
        method: 'POST',
        data: connection
      });
      setStatus({ online: data.online, message: data.message });
      setLogs(data.logs || []);
    } catch (err) {
      // handled in hook
    }
  };

  const handleExecuteQuery = async () => {
    try {
      const data = await request({
        url: '/api/query',
        method: 'POST',
        data: {
          connection,
          sql: selectedQueryObject.query
        }
      });
      setResults(data.results);
      setLogs(data.logs || []);
    } catch (err) {
      // handled in hook
    }
  };

  return (
    <main>
      <section style={{ padding: '3rem 0 4rem', textAlign: 'center' }}>
        <div className="container">
          <div className="card" style={{ padding: '2.5rem 2rem', background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', color: 'white' }}>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <p className="badge" style={{ background: 'rgba(96, 165, 250, 0.35)', color: 'white' }}>
                  Secure Hybrid Data Platform
                </p>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', margin: '1rem 0 0.75rem', lineHeight: 1.1 }}>
                  Bring your on-premises SQL Server to every mobile device
                </h1>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', fontSize: '1.05rem' }}>
                  A React + Node.js starter kit for organizations that require secure connectivity to Microsoft SQL
                  Server, Windows-authenticated auditing, and a touch-first experience.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="primary" style={{ background: 'white', color: '#1d4ed8' }}>
                  Explore dashboards
                </button>
                <button className="secondary" style={{ background: 'rgba(30,58,138,0.35)', color: 'white' }}>
                  Review architecture
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <StatusPill online={status.online} message={status.message} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="grid" style={{ gap: '1.25rem' }}>
            {featureCards.map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <div className="container grid" style={{ gap: '1.75rem' }}>
          <ConnectionForm connection={connection} onChange={setConnection} onTest={handleConnectionTest} testing={loading} />
          <QueryWorkbench
            selectedQuery={selectedQueryObject}
            onChange={handleQueryChange}
            onExecute={handleExecuteQuery}
            executing={loading}
            results={results}
          />
        </div>
      </section>

      <section style={{ marginTop: '2.5rem', marginBottom: '3rem' }}>
        <div className="container">
          <LogPanel logs={logs} />
        </div>
      </section>

      <section style={{ background: '#0f172a', color: 'rgba(255,255,255,0.82)', padding: '2.5rem 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: 'white' }}>Deployment Checklist</h2>
          <div className="grid" style={{ gap: '1.25rem', marginTop: '1.75rem' }}>
            {[
              'Host the backend API on your Windows Server (IIS or as a Windows Service).',
              'Leverage Windows Credential Guard or managed service accounts for authentication.',
              'Use corporate VPN or Azure ExpressRoute to bridge mobile clients to the API.',
              'Configure TLS certificates and rotate secrets with your enterprise vault.',
              'Monitor the Windows Event Viewer → Applications and Services Logs → Enterprise SQL Dashboard.'
            ].map((item) => (
              <div key={item} className="card" style={{ background: 'rgba(255,255,255,0.04)', color: 'inherit' }}>
                <p style={{ margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ padding: '1.5rem 0', textAlign: 'center', color: '#475569' }}>
        <div className="container">
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} Enterprise SQL Dashboard. Built with React + Express.</p>
        </div>
      </footer>

      {error && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '0.85rem 1.25rem',
            borderRadius: '0.85rem',
            boxShadow: '0 14px 30px rgba(248, 113, 113, 0.25)'
          }}
        >
          {error}
        </div>
      )}
    </main>
  );
}

export default App;
