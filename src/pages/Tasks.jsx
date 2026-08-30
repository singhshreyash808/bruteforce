import React, { useState, useEffect } from "react";
import "./Tasks.css";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "Inspector Ramesh",
    priority: "Medium"
  });

  const officers = [
    "Inspector Ramesh",
    "Sub-Inspector Priya",
    "Cyber Expert Amit",
    "DSP Sharma"
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/tasks");
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
      });
      const createdTask = await res.json();
      setTasks([createdTask, ...tasks]);
      setIsModalOpen(false);
      setNewTask({ title: "", description: "", assignedTo: "Inspector Ramesh", priority: "Medium" });
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const updatedTask = await res.json();
      setTasks(tasks.map(t => (t.id === taskId ? updatedTask : t)));
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const renderTaskCard = (task) => (
    <div key={task.id} className="task-card">
      <div className={`task-priority priority-${task.priority.toLowerCase()}`}>
        {task.priority} Priority
      </div>
      <h4>{task.title}</h4>
      <p>{task.description}</p>
      <div className="task-meta">
        <span className="assigned-to">👤 {task.assignedTo}</span>
      </div>
      
      {/* Quick action buttons to move task */}
      <div className="task-actions">
        {task.status !== "Pending" && (
          <button onClick={() => updateTaskStatus(task.id, "Pending")}>⬅ Pending</button>
        )}
        {task.status !== "In Progress" && (
          <button onClick={() => updateTaskStatus(task.id, "In Progress")}>
            {task.status === "Pending" ? "Start ➡" : "⬅ In Progress"}
          </button>
        )}
        {task.status !== "Completed" && (
          <button onClick={() => updateTaskStatus(task.id, "Completed")}>Complete ➡</button>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="tasks-container">Loading workflow...</div>;

  const pendingTasks = tasks.filter(t => t.status === "Pending");
  const inProgressTasks = tasks.filter(t => t.status === "In Progress");
  const completedTasks = tasks.filter(t => t.status === "Completed");

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <div>
          <h2>Workflow Management</h2>
          <p>Assign cases and track officer progress in real-time.</p>
        </div>
        <button className="primary-btn new-task-btn" onClick={() => setIsModalOpen(true)}>
          + Assign New Task
        </button>
      </div>

      <div className="kanban-board">
        {/* Column: Pending */}
        <div className="kanban-column">
          <div className="kanban-column-header">
            <h3>To Do (Pending)</h3>
            <span className="task-count">{pendingTasks.length}</span>
          </div>
          <div className="kanban-column-body">
            {pendingTasks.map(renderTaskCard)}
            {pendingTasks.length === 0 && <div className="empty-state">No pending tasks</div>}
          </div>
        </div>

        {/* Column: In Progress */}
        <div className="kanban-column">
          <div className="kanban-column-header in-progress-header">
            <h3>In Progress</h3>
            <span className="task-count">{inProgressTasks.length}</span>
          </div>
          <div className="kanban-column-body">
            {inProgressTasks.map(renderTaskCard)}
            {inProgressTasks.length === 0 && <div className="empty-state">No tasks in progress</div>}
          </div>
        </div>

        {/* Column: Completed */}
        <div className="kanban-column">
          <div className="kanban-column-header completed-header">
            <h3>Completed</h3>
            <span className="task-count">{completedTasks.length}</span>
          </div>
          <div className="kanban-column-body">
            {completedTasks.map(renderTaskCard)}
            {completedTasks.length === 0 && <div className="empty-state">No completed tasks</div>}
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Assign New Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input 
                  type="text" 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})} 
                  required 
                  placeholder="e.g. Investigate Phishing Ring in Andheri"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={newTask.description} 
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  rows="3"
                ></textarea>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assign To</label>
                  <select 
                    value={newTask.assignedTo} 
                    onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                  >
                    {officers.map(off => <option key={off} value={off}>{off}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    value={newTask.priority} 
                    onChange={e => setNewTask({...newTask, priority: e.target.value})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn submit-btn">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
