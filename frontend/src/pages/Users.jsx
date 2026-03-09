import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add,
  Delete,
  Key,
  ExpandMore,
  ExpandLess,
  PersonAdd,
  LinkOff,
  Speed,
} from "@mui/icons-material";
import { api } from "../api";

const DEFAULT_RPM = 60;

export default function UsersPage({ notify }) {
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [username, setUsername] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [newKeyDialog, setNewKeyDialog] = useState(null);
  const [assignDialog, setAssignDialog] = useState(null);
  const [rateLimitDialog, setRateLimitDialog] = useState(null);

  const load = () => {
    api.listUsers().then(setUsers).catch((e) => notify(e.message, "error"));
    api.listAgents().then(setAgents).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!username.trim()) return;
    try {
      const user = await api.createUser(username.trim());
      setUsername("");
      setNewKeyDialog(user.api_key);
      notify("User created");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteUser(id);
      notify("User deleted");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const regenKey = async (id) => {
    try {
      const res = await api.regenerateApiKey(id);
      setNewKeyDialog(res.api_key);
      notify("API key regenerated");
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={create}
          sx={{ whiteSpace: "nowrap" }}
        >
          Create User
        </Button>
      </Stack>

      <Stack spacing={2}>
        {users.map((u) => (
          <Card key={u.id} variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {u.username}
                  </Typography>
                </Box>
                <Chip label={u.role} size="small" color={u.role === "admin" ? "primary" : "default"} />
                <Chip
                  label={u.is_active ? "Active" : "Inactive"}
                  size="small"
                  color={u.is_active ? "success" : "default"}
                />
                <Chip
                  icon={<Speed sx={{ fontSize: 14 }} />}
                  label={`${u.rate_limit ?? DEFAULT_RPM} rpm`}
                  size="small"
                  variant={u.rate_limit != null ? "filled" : "outlined"}
                  color={u.rate_limit != null ? "warning" : "default"}
                  onClick={() => setRateLimitDialog(u)}
                  sx={{ cursor: "pointer" }}
                />
                <IconButton size="small" onClick={() => regenKey(u.id)} title="Regenerate API Key">
                  <Key />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                >
                  {expanded === u.id ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
                <IconButton size="small" color="error" onClick={() => remove(u.id)}>
                  <Delete />
                </IconButton>
              </Stack>
              <Collapse in={expanded === u.id}>
                <UserAgents
                  userId={u.id}
                  allAgents={agents}
                  notify={notify}
                  onAssignOpen={() => setAssignDialog(u.id)}
                />
              </Collapse>
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && (
          <Typography color="text.secondary" textAlign="center">
            No users.
          </Typography>
        )}
      </Stack>

      <Dialog open={!!newKeyDialog} onClose={() => setNewKeyDialog(null)}>
        <DialogTitle>API Key</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Copy this key now. It will not be shown again.
          </Typography>
          <TextField
            fullWidth
            value={newKeyDialog || ""}
            InputProps={{ readOnly: true }}
            onFocus={(e) => e.target.select()}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(newKeyDialog);
              notify("Copied to clipboard");
            }}
          >
            Copy
          </Button>
          <Button onClick={() => setNewKeyDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {assignDialog && (
        <AssignDialog
          userId={assignDialog}
          agents={agents}
          onClose={() => {
            setAssignDialog(null);
            load();
          }}
          notify={notify}
        />
      )}

      {rateLimitDialog && (
        <RateLimitDialog
          user={rateLimitDialog}
          onClose={() => {
            setRateLimitDialog(null);
            load();
          }}
          notify={notify}
        />
      )}
    </Box>
  );
}

function RateLimitDialog({ user, onClose, notify }) {
  const [value, setValue] = useState(user.rate_limit ?? DEFAULT_RPM);
  const [preset, setPreset] = useState(
    user.rate_limit == null ? "default" : "custom"
  );

  const presets = [
    { label: `Default (${DEFAULT_RPM})`, key: "default", val: null },
    { label: "Low (20)", key: "low", val: 20 },
    { label: "High (120)", key: "high", val: 120 },
    { label: "Custom", key: "custom", val: null },
  ];

  const selectPreset = (p) => {
    setPreset(p.key);
    if (p.key === "default") setValue(DEFAULT_RPM);
    else if (p.val != null) setValue(p.val);
  };

  const save = async () => {
    try {
      const rateLimit = preset === "default" ? null : value;
      await api.updateUser(user.id, { rate_limit: rateLimit });
      notify("Rate limit updated");
      onClose();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Rate Limit - {user.username}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Requests per minute
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {presets.map((p) => (
            <Chip
              key={p.key}
              label={p.label}
              size="small"
              variant={preset === p.key ? "filled" : "outlined"}
              color={preset === p.key ? "primary" : "default"}
              onClick={() => selectPreset(p)}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Slider
            value={value}
            onChange={(_, v) => {
              setValue(v);
              setPreset("custom");
            }}
            min={1}
            max={300}
            step={1}
            sx={{ flex: 1 }}
          />
          <TextField
            type="number"
            size="small"
            value={value}
            onChange={(e) => {
              setValue(Math.max(1, parseInt(e.target.value) || 1));
              setPreset("custom");
            }}
            sx={{ width: 80 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function UserAgents({ userId, allAgents, notify, onAssignOpen }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.getUser(userId).then(setDetail).catch(() => {});
  }, [userId]);

  const removeAccess = async (agentId) => {
    try {
      await api.removeAgentAccess(userId, agentId);
      notify("Access removed");
      api.getUser(userId).then(setDetail);
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Assigned Agents</Typography>
        <IconButton size="small" onClick={onAssignOpen}>
          <Add fontSize="small" />
        </IconButton>
      </Stack>
      {detail?.agents?.length ? (
        <List dense>
          {detail.agents.map((a) => (
            <ListItem
              key={a.id}
              secondaryAction={
                <IconButton edge="end" size="small" onClick={() => removeAccess(a.id)}>
                  <LinkOff fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText primary={a.name || a.base_url} secondary={a.base_url} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No agents assigned.
        </Typography>
      )}
    </Box>
  );
}

function AssignDialog({ userId, agents, onClose, notify }) {
  const [selected, setSelected] = useState([]);

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const assign = async () => {
    if (!selected.length) return;
    try {
      await api.assignAgents(userId, selected);
      notify("Agents assigned");
      onClose();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Agents</DialogTitle>
      <DialogContent>
        <List dense>
          {agents.map((a) => (
            <ListItem
              key={a.id}
              button
              selected={selected.includes(a.id)}
              onClick={() => toggle(a.id)}
            >
              <ListItemText primary={a.name || a.base_url} />
            </ListItem>
          ))}
          {agents.length === 0 && (
            <Typography color="text.secondary">No agents available.</Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={assign} disabled={!selected.length}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}
