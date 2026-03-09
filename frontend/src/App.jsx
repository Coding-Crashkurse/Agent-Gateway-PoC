import { useState, useCallback, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import { setApiKey, validateKey, onAuthError } from "./api";
import DashboardPage from "./pages/Dashboard";
import AgentsPage from "./pages/Agents";
import UsersPage from "./pages/Users";

function LoginDialog({ open, onLogin }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    const valid = await validateKey(key.trim());
    setLoading(false);
    if (valid) {
      setApiKey(key.trim());
      onLogin();
    } else {
      setError("Invalid API key");
    }
  };

  return (
    <Dialog open={open}>
      <DialogTitle>API Key</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="X-API-Key"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          error={!!error}
          helperText={error}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={submit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Connect"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem("apiKey");
    setLoggedIn(false);
  }, []);

  useEffect(() => {
    onAuthError(logout);

    const saved = localStorage.getItem("apiKey");
    if (saved) {
      validateKey(saved).then((valid) => {
        if (valid) setLoggedIn(true);
        else localStorage.removeItem("apiKey");
        setChecking(false);
      });
    } else {
      setChecking(false);
    }
  }, [logout]);

  const notify = useCallback((msg, severity = "success") => {
    setToast({ msg, severity });
  }, []);

  if (checking) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            A2A Agent Gateway
          </Typography>
          {loggedIn && (
            <Button color="inherit" onClick={logout}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <LoginDialog open={!loggedIn} onLogin={() => setLoggedIn(true)} />

      {loggedIn && (
        <>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
              <Tab label="Dashboard" />
              <Tab label="Agents" />
              <Tab label="Users" />
            </Tabs>
          </Box>
          <Container sx={{ mt: 3, mb: 3 }}>
            {tab === 0 && <DashboardPage notify={notify} />}
            {tab === 1 && <AgentsPage notify={notify} />}
            {tab === 2 && <UsersPage notify={notify} />}
          </Container>
        </>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={toast?.severity === "error" ? 10000 : 4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast && (
          <Alert
            severity={toast.severity}
            onClose={() => setToast(null)}
            sx={{ whiteSpace: "pre-line", maxWidth: 600 }}
          >
            {toast.msg}
          </Alert>
        )}
      </Snackbar>
    </>
  );
}
