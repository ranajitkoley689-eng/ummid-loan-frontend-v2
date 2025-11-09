import React, { useState, useEffect } from 'react';
import api from './services/api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  async function submit(e){
    e.preventDefault();
    setErr('');
    try{
      const res = await api.post('/api/auth/login', { username, password });
      const { token, role, name } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('name', name);
      onLogin({ token, role, name });
    }catch(err){
      setErr('Login failed: check credentials');
    }
  }
  return (
    <div className="card">
      <h2>Ummid Loan Management</h2>
      <form onSubmit={submit}>
        <input placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input type="password" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
      {err && <p className="err">{err}</p>}
      <p className="muted">Manager: rinku / 123123 — Workers: purnima, seema, kuhely, ranu, newworker</p>
    </div>
  );
}

function Header({ user, onLogout }){
  return (
    <div className="header">
      <div>Welcome, {user.name} ({user.role})</div>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

function useAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const name = localStorage.getItem('name');
  return { token, role, name };
}

function WorkerDashboard({ token }) {
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [todo, setTodo] = useState([]);
  const [form, setForm] = useState({ groupName:'', leaderName:'' });

  useEffect(()=> { fetchAll(); }, []);

  async function fetchAll(){
    try{
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const [gRes,mRes,lRes,tRes] = await Promise.all([
        api.get('/api/groups', h),
        api.get('/api/members', h),
        api.get('/api/loans', h),
        api.get('/api/todo', h)
      ]);
      setGroups(gRes.data);
      setMembers(mRes.data);
      setLoans(lRes.data);
      setTodo(tRes.data);
    }catch(e){ console.error(e); }
  }

  async function createGroup(e){
    e.preventDefault();
    try{
      const h = { headers: { Authorization: `Bearer ${token}` } };
      await api.post('/api/groups', { name: form.groupName, leaderName: form.leaderName }, h);
      setForm({ groupName:'', leaderName:'' });
      fetchAll();
    }catch(e){ console.error(e); }
  }

  return (
    <div className="container">
      <h3>Worker Dashboard</h3>

      <section className="card">
        <h4>Create Group</h4>
        <form onSubmit={createGroup}>
          <input placeholder="Group name" value={form.groupName} onChange={e=>setForm({...form, groupName:e.target.value})} />
          <input placeholder="Group leader name" value={form.leaderName} onChange={e=>setForm({...form, leaderName:e.target.value})} />
          <button type="submit">Add Group</button>
        </form>
      </section>

      <section className="card">
        <h4>To-do (EMIs due)</h4>
        {todo.length === 0 ? <p>No pending EMIs</p> : todo.map((t,i)=> (
          <div key={i} className="item">
            <div><b>{t.memberName}</b> ({t.aadhaar})</div>
            <div>Due: {new Date(t.dueDate).toLocaleDateString()} — ₹{t.amount}</div>
          </div>
        ))}
      </section>

      <section className="card">
        <h4>Groups ({groups.length})</h4>
        {groups.map(g => <div key={g._id} className="item">{g.name} — leader: {g.leaderName}</div>)}
      </section>

      <section className="card">
        <h4>Members ({members.length})</h4>
        {members.map(m => <div key={m._id} className="item">{m.name} — {m.aadhaar}</div>)}
      </section>

      <section className="card">
        <h4>Loans ({loans.length})</h4>
        {loans.map(loan => (
          <div key={loan._id} className="item">
            <div><b>{loan.memberId?.name || 'Member'}</b> — ₹{loan.principal} — {loan.status}</div>
            <div>EMI: ₹{loan.emiAmount} × {loan.emiCount}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function ManagerDashboard({ token }) {
  const [workers, setWorkers] = useState([]);
  const [revenue, setRevenue] = useState({ total:0 });
  useEffect(()=> { fetchData(); }, []);
  async function fetchData(){
    try{
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const w = await api.get('/api/reports/workers', h);
      const r = await api.get('/api/reports/revenue', h);
      setWorkers(w.data);
      setRevenue(r.data || {total:0});
    }catch(e){ console.error(e); }
  }
  return (
    <div className="container">
      <h3>Manager Dashboard</h3>
      <section className="card">
        <h4>Revenue</h4>
        <div>Total collected: ₹{revenue.total}</div>
      </section>

      <section className="card">
        <h4>Workers Overview</h4>
        {workers.map(w => (
          <div key={w.workerId} className="item">
            <b>{w.name}</b> — groups: {w.groupsCount} — members: {w.membersCount} — loans: {w.loansGiven}
          </div>
        ))}
      </section>
    </div>
  );
}

export default function App(){
  const auth = useAuth();
  const [user, setUser] = useState(auth.token ? { token: auth.token, role: auth.role, name: auth.name } : null);

  function handleLogout(){
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setUser(null);
  }

  if (!user) return <Login onLogin={(u)=> setUser(u)} />;

  const token = localStorage.getItem('token');
  return (
    <div>
      <Header user={{ name: localStorage.getItem('name'), role: localStorage.getItem('role') }} onLogout={handleLogout} />
      {localStorage.getItem('role') === 'manager' ? <ManagerDashboard token={token} /> : <WorkerDashboard token={token} />}
    </div>
  );
    }
