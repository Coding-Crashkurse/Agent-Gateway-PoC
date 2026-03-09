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
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
} from "@mui/material";
import {
  Add,
  Delete,
  ExpandMore,
  ExpandLess,
  Circle,
  Clear,
} from "@mui/icons-material";
import { api } from "../api";

const statusColor = { online: "success", offline: "default", error: "error", unknown: "warning" };

export default function AgentsPage({ notify }) {
  const [agents, setAgents] = useState([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    const tagFilter = filterTags.length > 0 ? filterTags.join(",") : undefined;
    api.listAgents(tagFilter).then(setAgents).catch((e) => notify(e.message, "error"));
    api.listTags().then(setAllTags).catch(() => {});
  };

  useEffect(() => { load(); }, [filterTags]);

  const register = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      await api.registerAgent(url.trim());
      setUrl("");
      notify("Agent registered");
      load();
    } catch (e) {
      if (e.validationErrors?.length) {
        notify(`${e.message}:\n${e.validationErrors.join("\n")}`, "error");
      } else {
        notify(e.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const remove = async (agent) => {
    setConfirmDelete(null);
    try {
      await api.deleteAgent(agent.id);
      notify("Agent deleted");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const togglePublic = async (agent) => {
    try {
      await api.updateAgent(agent.id, { is_public: !agent.is_public });
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const toggleFilter = (tag) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Agent Base URL"
          placeholder="https://agent.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && register()}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={register}
          disabled={loading}
          sx={{ whiteSpace: "nowrap" }}
        >
          Register
        </Button>
      </Stack>

      {allTags.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Filter by tag:
            </Typography>
            {allTags.map((t) => (
              <Chip
                key={t.tag}
                label={`${t.tag} (${t.count})`}
                size="small"
                variant={filterTags.includes(t.tag) ? "filled" : "outlined"}
                color={filterTags.includes(t.tag) ? "primary" : "default"}
                onClick={() => toggleFilter(t.tag)}
              />
            ))}
            {filterTags.length > 0 && (
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={() => setFilterTags([])}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Box>
      )}

      <Stack spacing={2}>
        {agents.map((a) => (
          <Card key={a.id} variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Circle
                  sx={{ fontSize: 12 }}
                  color={statusColor[a.status] || "disabled"}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {a.name || a.base_url}
                    </Typography>
                    {a.tags?.map((t) => (
                      <Chip
                        key={t}
                        label={t}
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => toggleFilter(t)}
                        sx={{ cursor: "pointer" }}
                      />
                    ))}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {a.base_url}
                  </Typography>
                </Box>
                <Chip label={a.status} size="small" color={statusColor[a.status] || "default"} />
                <FormControlLabel
                  control={
                    <Switch checked={a.is_public} onChange={() => togglePublic(a)} size="small" />
                  }
                  label="Public"
                />
                <IconButton
                  size="small"
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                >
                  {expanded === a.id ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
                <IconButton size="small" color="error" onClick={() => setConfirmDelete(a)}>
                  <Delete />
                </IconButton>
              </Stack>
              {a.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {a.description}
                </Typography>
              )}
              {a.last_seen && (
                <Typography variant="caption" color="text.secondary">
                  Last seen: {new Date(a.last_seen).toLocaleString()}
                </Typography>
              )}
              <Collapse in={expanded === a.id}>
                <AgentCardView agentId={a.id} notify={notify} onTagsChanged={load} />
              </Collapse>
            </CardContent>
          </Card>
        ))}
        {agents.length === 0 && (
          <Typography color="text.secondary" textAlign="center">
            No agents registered yet.
          </Typography>
        )}
      </Stack>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete Agent</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{confirmDelete?.name || confirmDelete?.base_url}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => remove(confirmDelete)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>
        {label}:
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

function AgentCardView({ agentId, notify, onTagsChanged }) {
  const [card, setCard] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editTags, setEditTags] = useState(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    api.getAgent(agentId).then((d) => {
      setCard(d.agent_card);
      setDetail(d);
    }).catch(() => {});
  }, [agentId]);

  const startEditTags = () => setEditTags(detail?.tags || []);

  const saveTags = async () => {
    try {
      await api.updateAgent(agentId, { tags: editTags });
      setEditTags(null);
      notify("Tags updated");
      onTagsChanged();
      api.getAgent(agentId).then((d) => { setCard(d.agent_card); setDetail(d); });
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const addEditTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !editTags.includes(t) && editTags.length < 10) {
      setEditTags([...editTags, t]);
    }
    setTagInput("");
  };

  if (!card) return null;

  const skills = card.skills || [];
  const caps = card.capabilities || {};

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
      <InfoRow label="Name" value={card.name} />
      <InfoRow label="Description" value={card.description} />
      <InfoRow label="URL" value={card.url} />
      <InfoRow label="Version" value={card.version} />
      <InfoRow label="Provider" value={card.provider?.organization} />
      <InfoRow label="Documentation" value={card.documentationUrl} />

      <Box sx={{ mt: 1.5, mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>Tags:</Typography>
          {editTags === null ? (
            <Button size="small" onClick={startEditTags}>Edit</Button>
          ) : (
            <>
              <Button size="small" onClick={saveTags}>Save</Button>
              <Button size="small" onClick={() => setEditTags(null)}>Cancel</Button>
            </>
          )}
        </Stack>
        {editTags !== null ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            {editTags.map((t) => (
              <Chip
                key={t}
                label={t}
                size="small"
                color="primary"
                onDelete={() => setEditTags(editTags.filter((x) => x !== t))}
              />
            ))}
            <TextField
              size="small"
              placeholder="Add tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addEditTag(); }
              }}
              sx={{ width: 120 }}
            />
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {(detail?.tags || []).length > 0
              ? detail.tags.map((t) => (
                  <Chip key={t} label={t} size="small" variant="outlined" color="primary" />
                ))
              : <Typography variant="body2" color="text.secondary">No tags</Typography>
            }
          </Stack>
        )}
      </Box>

      {Object.keys(caps).length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Capabilities:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {caps.streaming && <Chip label="Streaming" size="small" color="info" />}
            {caps.pushNotifications && <Chip label="Push Notifications" size="small" color="info" />}
            {caps.stateTransitionHistory && <Chip label="State History" size="small" color="info" />}
          </Stack>
        </Box>
      )}

      {skills.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Skills ({skills.length}):
          </Typography>
          <Stack spacing={1}>
            {skills.map((s, i) => (
              <Box key={i} sx={{ pl: 1, borderLeft: "3px solid", borderColor: "primary.light" }}>
                <Typography variant="body2" fontWeight={600}>
                  {s.name || s.id}
                </Typography>
                {s.description && (
                  <Typography variant="caption" color="text.secondary">
                    {s.description}
                  </Typography>
                )}
                {s.tags?.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                    {s.tags.map((t) => (
                      <Chip key={t} label={t} size="small" variant="outlined" />
                    ))}
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {card.defaultInputModes?.length > 0 && (
        <InfoRow label="Input Modes" value={card.defaultInputModes.join(", ")} />
      )}
      {card.defaultOutputModes?.length > 0 && (
        <InfoRow label="Output Modes" value={card.defaultOutputModes.join(", ")} />
      )}
    </Box>
  );
}
