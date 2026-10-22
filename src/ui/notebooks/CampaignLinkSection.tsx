/**
 * @file The notebook menu's Encounters section: whether the open notebook is
 * linked to an Encounters campaign, and the picker to link it.
 */
import { Link2, Link2Off, Swords } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../domain/ids';
import { byName } from '../../domain/notebook';
import { linkNotebook, unlinkNotebook, useCampaignLink } from '../../state/campaignLink';
import { useLibrary } from '../../state/libraryStore';
import { Modal } from '../common/Modal';

/** Status line and link/unlink button for one notebook. */
export function CampaignLinkSection({ notebookId, onPick }: { notebookId: Id; onPick: () => void }) {
  const problem = useCampaignLink((s) => (s.location ? null : s.problem));
  const claim = useCampaignLink((s) => s.claims[notebookId] ?? null);
  const status = useCampaignLink((s) => s.status[notebookId]);
  const campaignName = useCampaignLink((s) => s.partner?.campaigns.find((c) => c.id === claim?.partnerId)?.name);

  if (problem) {
    return (
      <div className="campaign-link-section">
        <span className="muted">{problem}</span>
      </div>
    );
  }

  return (
    <div className="campaign-link-section">
      <Swords size={15} className="campaign-link-icon" />
      {!claim ? (
        <>
          <span className="spacer muted">Not linked to an Encounters campaign</span>
          <button onClick={onPick}>
            <Link2 size={15} /> Link…
          </button>
        </>
      ) : (
        <>
          <span className="spacer">
            {status === 'linked' ? (
              <>
                Linked to <strong>{campaignName ?? 'a campaign'}</strong>
              </>
            ) : (
              <span className="muted">
                Waiting for Encounters to confirm <strong>{campaignName ?? 'the link'}</strong>
              </span>
            )}
          </span>
          <button onClick={() => unlinkNotebook(notebookId)} title={status === 'linked' ? 'Unlink' : 'Cancel the link'}>
            <Link2Off size={15} /> {status === 'linked' ? 'Unlink' : 'Cancel'}
          </button>
        </>
      )}
    </div>
  );
}

/** Lists Encounters' campaigns; picking one links the notebook to it. */
export function LinkCampaignDialog({ notebookId, close }: { notebookId: Id; close: () => void }) {
  const partner = useCampaignLink((s) => s.partner);
  const partnerProblem = useCampaignLink((s) => s.partnerProblem);
  const notebooks = useLibrary((s) => s.notebooks);
  const notebookName = notebooks.find((n) => n.id === notebookId)?.name ?? 'this notebook';
  const [query, setQuery] = useState('');

  const campaigns = [...(partner?.campaigns ?? [])]
    .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => byName(a.name, b.name));

  /** The other notebook a campaign is already linked to, if any. */
  const linkedElsewhere = (campaignLink: { partnerId: string } | null) =>
    campaignLink && campaignLink.partnerId !== notebookId
      ? notebooks.find((n) => n.id === campaignLink.partnerId)?.name ?? 'another notebook'
      : null;

  return (
    <Modal title={`Link "${notebookName}" to Encounters`} size="small" onClose={close} footer={<button onClick={close}>Cancel</button>}>
      {partnerProblem ? (
        <p className="muted">Encounters' campaign list couldn't be read: {partnerProblem}</p>
      ) : !partner ? (
        <p className="muted">Encounters hasn't shared its campaigns on this device yet. Open Encounters once, then try again.</p>
      ) : (
        <div className="link-campaign-picker">
          <input autoFocus placeholder="Search campaigns" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="link-campaign-list">
            {campaigns.length === 0 && <p className="muted">No campaigns match.</p>}
            {campaigns.map((c) => {
              const elsewhere = linkedElsewhere(c.link);
              return (
                <button
                  key={c.id}
                  className="link-campaign-option"
                  disabled={!!elsewhere}
                  title={elsewhere ? `Already linked to "${elsewhere}"; unlink it there first` : undefined}
                  onClick={() => {
                    linkNotebook(notebookId, c.id);
                    close();
                  }}
                >
                  <Swords size={15} />
                  <span className="spacer">{c.name}</span>
                  {elsewhere && <span className="muted">linked to {elsewhere}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
