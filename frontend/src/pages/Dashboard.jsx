import { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Paper,
} from "@mui/material";
import { Circle } from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../api";

const REFRESH_INTERVAL = 30000;

const statusColor = { online: "success", offline: "default", error: "error", unknown: "warning" };

function KpiCard({ title, value, subtitle, color }) {
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={700} color={color}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function errorRateColor(rate) {
  if (rate < 5) return "success.main";
  if (rate < 15) return "warning.main";
  return "error.main";
}

export default function DashboardPage({ notify }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const load = () => {
    api
      .getStats()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((e) => {
        notify(e.message, "error");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) return null;

  const chartData = stats.invocations_per_hour.map((d) => ({
    hour: d.hour.slice(11, 16),
    count: d.count,
  }));

  return (
    <Box>
      {/* KPI Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <KpiCard
          title="Agents Online"
          value={`${stats.online_agents} / ${stats.total_agents}`}
          subtitle={`${stats.offline_agents} offline, ${stats.error_agents} error`}
          color={stats.online_agents > 0 ? "success.main" : "text.secondary"}
        />
        <KpiCard title="Active Users" value={stats.active_users} subtitle={`${stats.total_users} total`} />
        <KpiCard title="Requests (24h)" value={stats.total_invocations_24h} subtitle={`${stats.total_invocations_7d} in 7d`} />
        <KpiCard
          title="Error Rate (24h)"
          value={`${stats.error_rate_24h}%`}
          color={errorRateColor(stats.error_rate_24h)}
        />
        <KpiCard
          title="Avg Latency (24h)"
          value={stats.avg_duration_ms_24h != null ? `${stats.avg_duration_ms_24h} ms` : "N/A"}
        />
      </Stack>

      {/* Invocations Chart */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Requests per Hour (last 24h)
        </Typography>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1976d2" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No invocations in the last 24 hours.
          </Typography>
        )}
      </Paper>

      {/* Top Agents Table */}
      <Paper variant="outlined">
        <Typography variant="subtitle2" sx={{ p: 2, pb: 0 }}>
          Top Agents (7d)
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Invocations</TableCell>
                <TableCell align="right">Avg Latency</TableCell>
                <TableCell align="right">Error Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.top_agents.map((a) => {
                const errRate =
                  a.total_invocations > 0
                    ? ((a.error_count / a.total_invocations) * 100).toFixed(1)
                    : "0.0";
                return (
                  <TableRow key={a.agent_id}>
                    <TableCell>{a.agent_name || a.agent_id}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<Circle sx={{ fontSize: 10 }} />}
                        label={a.status}
                        size="small"
                        color={statusColor[a.status] || "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{a.total_invocations}</TableCell>
                    <TableCell align="right">
                      {a.avg_duration_ms != null ? `${a.avg_duration_ms} ms` : "N/A"}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={errorRateColor(parseFloat(errRate))}
                      >
                        {errRate}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {stats.top_agents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No agents yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
