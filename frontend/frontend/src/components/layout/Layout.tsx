import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';
import { ImpersonateDropdown } from '../common/ImpersonateDropdown';

export const Layout = () => {
    return (
        <div className="min-h-screen bg-hawks-base flex">
            <Sidebar />
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-7xl mx-auto flex justify-end mb-4">
                    <ImpersonateDropdown />
                </div>
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
