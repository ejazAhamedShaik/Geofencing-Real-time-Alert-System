import { useState, type ReactNode } from 'react';
import { AppBar, Box, Chip, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import { useHealth } from '../lib/queries';

const drawerWidth = 252;
const navigation = [
  { to: '/', label: 'Overview', mark: 'OV', end: true },
  { to: '/geofences', label: 'Geofences', mark: 'GF' },
  { to: '/vehicles', label: 'Vehicles', mark: 'VH' },
  { to: '/alerts', label: 'Alert rules', mark: 'AL' },
  { to: '/history', label: 'Event history', mark: 'EV' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const health = useHealth();
  const activePage = navigation.find((item) => item.to === location.pathname)?.label ?? 'Overview';

  const drawer = (
    <Box className="sidebar-content">
      <Box className="brand-lockup">
        <div className="brand-mark"><span /></div>
        <Box>
          <Typography className="brand-title">Boundary</Typography>
          <Typography className="brand-caption">FLEET OPERATIONS</Typography>
        </Box>
      </Box>
      <Typography className="nav-section-label">WORKSPACE</Typography>
      <List disablePadding className="nav-list">
        {navigation.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className="nav-item"
            sx={{ '&.active': { color: '#fff', backgroundColor: 'rgba(68, 202, 179, .14)' }, '&.active .nav-mark': { color: '#7de0c9', backgroundColor: 'rgba(68, 202, 179, .18)' } }}
          >
            <span className="nav-mark">{item.mark}</span>
            <ListItemText primary={item.label} />
            <span className="nav-chevron">›</span>
          </ListItemButton>
        ))}
      </List>
      <Box className="sidebar-bottom">
        <div className="sidebar-orbit"><span /><span /><span /></div>
        <Typography variant="subtitle2" fontWeight={700}>Stay ahead of the route.</Typography>
        <Typography variant="caption" color="rgba(232,246,241,.62)">Your fleet activity, in one place.</Typography>
      </Box>
    </Box>
  );

  return (
    <Box className="app-frame">
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={!isMobile || mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}
      >
        {drawer}
      </Drawer>
      <Box component="main" className="main-column" sx={{ ml: { md: `${drawerWidth}px` } }}>
        <AppBar position="sticky" elevation={0} className="topbar">
          <Toolbar className="topbar-inner">
            {isMobile && <IconButton onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="menu-button"><span>☰</span></IconButton>}
            <Box className="topbar-title">
              <Typography variant="caption" className="eyebrow">OPERATIONS CENTER</Typography>
              <Typography variant="h6">{activePage}</Typography>
            </Box>
            <Box className="topbar-actions">
              <Chip
                size="small"
                label={health.isSuccess ? 'API connected' : health.isError ? 'API unavailable' : 'Checking API'}
                className={health.isSuccess ? 'api-chip api-chip--online' : health.isError ? 'api-chip api-chip--offline' : 'api-chip'}
                icon={<span className="status-dot" />}
              />
              <div className="profile-avatar">OP</div>
            </Box>
          </Toolbar>
        </AppBar>
        <Box className="page-container">{children}</Box>
        <Box component="footer" className="app-footer"><span>BOUNDARY <i>•</i> FLEET VISIBILITY</span><span>Geofencing operations</span></Box>
      </Box>
    </Box>
  );
}
