import React, { useState, useEffect } from 'react';
import './App.css';

// Base URL of the backend API
const API_BASE = "https://vscode-internal-695-beta.beta01.cloud.kavia.ai:3001";

function TicketSubmissionForm({ onSubmit, loading }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');

  // PUBLIC_INTERFACE
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErr("Subject and description are required.");
      return;
    }
    setErr('');
    await onSubmit({ subject, description });
    setSubject('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 32, marginTop: 24, background: '#132638', padding: 24, borderRadius: 8 }}>
      <h2 style={{ margin: 0 }}>Submit New Ticket</h2>
      <div style={{ marginTop: 16 }}>
        <label>
          <strong>Subject</strong>
          <input
            type="text"
            value={subject}
            style={{ display: "block", width: "100%", margin: "6px 0 16px 0", padding: 8, fontSize: "1rem" }}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary"
          />
        </label>
      </div>
      <div>
        <label>
          <strong>Description</strong>
          <textarea
            value={description}
            style={{ display: "block", width: "100%", minHeight: 64, margin: "6px 0 16px 0", padding: 8, fontSize: "1rem" }}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue/feedback"
          />
        </label>
      </div>
      {err && <div style={{ color: "#ff1a1a", marginBottom: 8 }}>{err}</div>}
      <button className="btn btn-large" type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Ticket"}</button>
    </form>
  );
}

function TicketList({ tickets, onEdit, onRefresh }) {
  if (tickets.length === 0) return <div>No tickets submitted yet.</div>;

  return (
    <div>
      <h2>Submitted Tickets</h2>
      <button className="btn" style={{ marginBottom: 16 }} onClick={onRefresh}>Refresh</button>
      <table style={{ width: "100%", background: "#122", borderRadius: 6, overflow: 'hidden' }}>
        <thead style={{ background: "#07214f", color: "white" }}>
          <tr>
            <th style={{ padding: '8px' }}>ID</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => (
            <tr key={ticket.id}>
              <td style={{ fontSize: "0.9em", color: "#aaa", padding: '6px 8px' }}>{(ticket.id || "").slice(0, 8)}</td>
              <td>{ticket.subject}</td>
              <td>
                <span style={{
                  padding: "2px 10px", borderRadius: 12,
                  background: ticket.status === "open" ? "#20bfa9" : ticket.status === "in_progress" ? "#ffd600" :
                    ticket.status === "resolved" ? "#82df94" : "#626262",
                  color: "#212121", fontWeight: "bold",
                  fontSize: '0.95em'
                }}>
                  {ticket.status}
                </span>
              </td>
              <td style={{ fontSize: "0.95em" }}>{new Date(ticket.updated_at).toLocaleString()}</td>
              <td>
                <button className="btn" style={{ padding: "3px 12px", fontSize: "0.9em" }} onClick={() => onEdit(ticket)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TicketEditDialog({ ticket, show, onClose, onSave, loading }) {
  const [form, setForm] = useState({ subject: ticket.subject, description: ticket.description, status: ticket.status });

  useEffect(() => {
    if (show) {
      setForm({ subject: ticket.subject, description: ticket.description, status: ticket.status });
    }
  }, [show, ticket]);

  if (!show) return null;

  // PUBLIC_INTERFACE
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // PUBLIC_INTERFACE
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div
      style={{
        position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
        zIndex: 9999, background: "rgba(10,18,30,0.8)", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
      <form 
        onSubmit={handleSubmit} 
        style={{
          background: "#1e324f", borderRadius: 8, padding: 24, minWidth: 340, boxShadow: "0 8px 40px 0 #2227"
        }}>
        <h3>Edit Ticket</h3>
        <div>
          <label>
            Subject
            <input name="subject" value={form.subject} onChange={handleChange} style={{ width: "100%", margin: "5px 0 13px", padding: "7px" }} />
          </label>
        </div>
        <div>
          <label>
            Description
            <textarea name="description" value={form.description} onChange={handleChange} style={{ width: "100%", margin: "5px 0 13px", padding: "7px" }} />
          </label>
        </div>
        <div>
          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange} style={{ width: "100%", margin: "5px 0 18px", padding: "7px" }}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn" type="button" onClick={onClose} style={{ background: '#556' }}>Cancel</button>
          <button className="btn" type="submit" style={{ minWidth: 80 }} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  // State for tickets, edit modal, errors, loading
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [err, setErr] = useState('');

  // PUBLIC_INTERFACE
  // Fetch all tickets
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tickets`);
      if (!res.ok) throw new Error("Failed to load tickets.");
      const data = await res.json();
      setTickets(data);
    } catch (e) {
      setErr(e.message || "Error fetching tickets");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line
  }, []);

  // PUBLIC_INTERFACE
  // Submit a new ticket
  const handleSubmit = async ({ subject, description }) => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to submit ticket");
      }
      await fetchTickets();
    } catch (e) {
      setErr(e.message || "Error submitting ticket.");
    }
    setLoading(false);
  };

  // PUBLIC_INTERFACE
  // Open edit modal
  const handleEdit = (ticket) => {
    setEditTicket(ticket);
    setShowEdit(true);
  };

  // PUBLIC_INTERFACE
  // Save ticket update
  const handleSave = async (updatedFields) => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE}/tickets/${editTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update ticket.");
      }
      await fetchTickets();
      setShowEdit(false);
      setEditTicket(null);
    } catch (e) {
      setErr(e.message || "Error updating ticket.");
    }
    setLoading(false);
  };

  // PUBLIC_INTERFACE
  // Close edit modal
  const handleCloseEdit = () => {
    setShowEdit(false);
    setEditTicket(null);
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className="logo">
              <span className="logo-symbol">*</span> SilentSupport
            </div>
            <span style={{ color: "#20ffa2", fontSize: "1.09em", fontWeight: 500 }}>
              Anonymous Ticketing
            </span>
          </div>
        </div>
      </nav>

      <main>
        <div className="container" style={{ marginTop: 100 }}>
          <div className="hero" style={{ paddingTop: 34, paddingBottom: 36 }}>
            <div className="subtitle" style={{ marginBottom: 4 }}>Submit feedback or report issues anonymously</div>
            <h1 className="title" style={{ fontSize: 32, marginBottom: 13, marginTop: 0 }}>
              Anonymous Ticketing System
            </h1>
            <div className="description" style={{ marginBottom: 16 }}>
              Your submissions are not linked to any identity—please keep your reference ticket ID to track progress.
            </div>
            <TicketSubmissionForm onSubmit={handleSubmit} loading={loading} />
            {err && <div style={{ color: "#ff1a1a", marginBottom: 10 }}>{err}</div>}
            {loading && <div style={{ color: "#1cf5e1" }}>Loading...</div>}
            <TicketList tickets={tickets} onEdit={handleEdit} onRefresh={fetchTickets} />
            {showEdit && editTicket &&
              <TicketEditDialog
                ticket={editTicket}
                show={showEdit}
                onClose={handleCloseEdit}
                onSave={handleSave}
                loading={loading}
              />
            }
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;