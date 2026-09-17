import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext.jsx';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                    <Link to="/" className="text-lg font-semibold text-indigo-600">
                        StudyFlowAI
                    </Link>
                    <div className="flex items-center gap-3 text-sm">
                        {user?.role === 'admin' && (
                            <Link to="/admin" className="text-indigo-600 hover:underline">
                                Admin
                            </Link>
                        )}
                        <span className="text-slate-600">{user?.name}</span>
                        <button
                            onClick={handleLogout}
                            className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-8">
                <Outlet />
            </main>
        </div>
    );
}