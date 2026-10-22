/**
 * @file Root layout: top bar, sidebar and the open page, plus the floating
 * peek panel, confirmation dialog and error notices.
 */
import { ConfirmDialog } from './common/ConfirmDialog';
import { ErrorNotices } from './common/ErrorNotices';
import { PageView } from './page/PageView';
import { PeekPanel } from './peek/PeekPanel';
import { Sidebar } from './sidebar/Sidebar';
import { TopBar } from './TopBar';

/** The whole app window. */
export function App() {
  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        <Sidebar />
        <PageView />
      </div>
      <PeekPanel />
      <ConfirmDialog />
      <ErrorNotices />
    </div>
  );
}
