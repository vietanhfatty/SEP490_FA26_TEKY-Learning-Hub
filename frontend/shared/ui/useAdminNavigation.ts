import { useLocation, useNavigate } from 'react-router-dom';
import { getNavItemsForRole } from './lmsNavigation';

export function useAdminNavigation(basePath: string, enabled = true) {
  const location = useLocation();
  const navigate = useNavigate();
  const requested = new URLSearchParams(location.search).get('view');
  const activeNavId = location.pathname === `${basePath}/directory` ? 'directory'
    : getNavItemsForRole('system_admin').some(item => item.id === requested && item.id !== 'directory')
      ? requested! : 'overview';
  return enabled ? {
    activeNavId,
    onSelectNav: (id: string) => navigate(id === 'directory' ? `${basePath}/directory`
      : id === 'overview' ? basePath : `${basePath}?view=${encodeURIComponent(id)}`),
  } : {};
}
